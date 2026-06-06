'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HOUR_MS,
  INITIAL_ENTRIES,
  DEFAULT_SETTINGS,
  buildDailyDurations,
  buildWeeklyChartData,
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
  formatTrend,
  getEntryDurationMs,
  getPageTitle,
  goalHint,
  isDateInCurrentWeek,
  isDateInPreviousWeek,
  isSameDay,
  type Entry,
  type ManualFormState,
  type Settings,
  type View,
  type WeeklyBar
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
  active_shift_start: string | null
}

type EntryRow = {
  id: string
  start_at: string
  end_at: string
  source: Entry['source']
  note: string | null
}

type WorkClockAppProps = {
  currentView: View
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
  { view: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <GridIcon className="h-5 w-5" /> },
  { view: 'entries', href: '/dashboard/entries', label: 'Entries', icon: <ListIcon className="h-5 w-5" /> },
  { view: 'reports', href: '/dashboard/reports', label: 'Reports', icon: <ChartIcon className="h-5 w-5" /> },
  { view: 'settings', href: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> }
]

const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

export function WorkClockApp({ currentView, userEmail, userId }: WorkClockAppProps) {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [pendingShift, setPendingShift] = useState<PendingShift | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    createDefaultManualForm(new Date())
  )

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

  const lastWeekEntries = useMemo(
    () => sortedEntries.filter((entry) => isDateInPreviousWeek(new Date(entry.start), now)),
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

  const lastWeekHours = useMemo(
    () => lastWeekEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0) / HOUR_MS,
    [lastWeekEntries]
  )

  const projectedWeeklyPay = weekHours * settings.hourlyRate
  const earningsTrend =
    lastWeekHours <= 0 ? null : ((weekHours - lastWeekHours) / lastWeekHours) * 100
  const weeklyGoalProgress =
    settings.weeklyGoalHours <= 0 ? 0 : weekHours / settings.weeklyGoalHours
  const recentEntries = sortedEntries.slice(0, 6)
  const longestShiftHours = useMemo(
    () =>
      sortedEntries.reduce((longest, entry) => {
        const durationHours = getEntryDurationMs(entry) / HOUR_MS
        return Math.max(longest, durationHours)
      }, 0),
    [sortedEntries]
  )
  const averageDailyHours = useMemo(() => {
    const dailyDurations = buildDailyDurations(currentWeekEntries)
    const values = Object.values(dailyDurations)
    if (values.length === 0) {
      return 0
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [currentWeekEntries])

  const weeklyBars = useMemo(
    () => buildWeeklyChartData(sortedEntries, now, activeShiftDurationMs),
    [activeShiftDurationMs, now, sortedEntries]
  )

  const pageTitle = getPageTitle(currentView)

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
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, active_shift_start')
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
        active_shift_start: null
      })
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, active_shift_start')
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

  async function handleDeleteEntry(id: string) {
    const previousEntries = entries
    setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== id))

    const { error } = await supabase.from('time_entries').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      setEntries(previousEntries)
      setSettingsNotice(error.message)
    }
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

    if (settings.hourlyRate < 0 || settings.weeklyGoalHours <= 0) {
      setSettingsNotice('Hourly rate must be positive and weekly goal above zero.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        worker_name: settings.workerName.trim() || DEFAULT_SETTINGS.workerName,
        hourly_rate: settings.hourlyRate,
        weekly_goal_hours: settings.weeklyGoalHours
      })
      .eq('user_id', userId)

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setSettingsNotice('Settings saved to Supabase.')
    window.setTimeout(() => setSettingsNotice(null), 2500)
  }

  async function resetDemoData() {
    const defaultSettings = {
      ...DEFAULT_SETTINGS,
      workerName: settings.workerName || DEFAULT_SETTINGS.workerName
    }

    const { error: deleteError } = await supabase.from('time_entries').delete().eq('user_id', userId)
    if (deleteError) {
      setSettingsNotice(deleteError.message)
      return
    }

    const { error: insertError } = await supabase.from('time_entries').insert(
      INITIAL_ENTRIES.map((entry) => ({
        id: entry.id,
        user_id: userId,
        start_at: entry.start,
        end_at: entry.end,
        source: entry.source,
        note: entry.note ?? null
      }))
    )

    if (insertError) {
      setSettingsNotice(insertError.message)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        worker_name: defaultSettings.workerName,
        hourly_rate: defaultSettings.hourlyRate,
        weekly_goal_hours: defaultSettings.weeklyGoalHours,
        active_shift_start: null
      })
      .eq('user_id', userId)

    if (profileError) {
      setSettingsNotice(profileError.message)
      return
    }

    setEntries(INITIAL_ENTRIES)
    setSettings(defaultSettings)
    setSettingsNotice('Demo data restored from Supabase.')
    window.setTimeout(() => setSettingsNotice(null), 2500)
  }

  if (isBusy) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-600">
        Loading your Supabase workspace…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="hidden w-[280px] flex-col border-r border-slate-200 bg-white px-6 py-8 lg:flex">
          <Brand />
          <div className="mt-10 space-y-2">
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.view}
                active={currentView === item.view}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </div>

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
                onAddManualEntry={handleOpenNewManualEntry}
                onContinueShift={() => void handleContinueShift()}
                onSaveShift={() => void handleSavePendingShift()}
                onStartShift={() => void handleStartShift()}
                onStopShift={() => void handleStopShift()}
                projectedWeeklyPay={projectedWeeklyPay}
                recentEntries={recentEntries}
                settings={settings}
                todayHours={todayHours}
                weekHours={weekHours}
                weeklyBars={weeklyBars}
                weeklyGoalProgress={weeklyGoalProgress}
              />
            ) : null}

            {currentView === 'entries' ? (
              <EntriesView
                entries={sortedEntries}
                onAddManualEntry={handleOpenNewManualEntry}
                onDeleteEntry={(id) => void handleDeleteEntry(id)}
                onEditEntry={handleEditEntry}
              />
            ) : null}

            {currentView === 'reports' ? (
              <ReportsView
                entries={sortedEntries}
                hourlyRate={settings.hourlyRate}
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
    </main>
  )

  function mapProfileToSettings(profile: ProfileRow): Settings {
    return {
      workerName: profile.worker_name,
      hourlyRate: profile.hourly_rate,
      weeklyGoalHours: profile.weekly_goal_hours,
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
  earningsTrend,
  onAddManualEntry,
  onContinueShift,
  onSaveShift,
  onStartShift,
  onStopShift,
  projectedWeeklyPay,
  recentEntries,
  settings,
  todayHours,
  weekHours,
  weeklyBars,
  weeklyGoalProgress
}: {
  activeShiftDurationMs: number
  activeShiftStart: string | null
  pendingShift: PendingShift | null
  earningsTrend: number | null
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
  weeklyBars: WeeklyBar[]
  weeklyGoalProgress: number
}) {
  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Today</p>
                <p className="mt-3 text-5xl font-extrabold tracking-[-0.06em] text-indigo-600 sm:text-6xl">
                  {formatDuration(todayHours)}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {activeShiftStart
                    ? `Currently running since ${formatTime(new Date(activeShiftStart))}`
                    : pendingShift
                      ? `Paused at ${formatTime(new Date(pendingShift.end))}`
                      : 'No active shift right now.'}
                </p>
              </div>

              <div className="rounded-[26px] bg-slate-50 p-4 sm:p-5 lg:min-w-[280px]">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-indigo-100 text-indigo-600">
                    <ClockOutline className="h-10 w-10" />
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
                    <StopIcon className="h-5 w-5" />
                    Stop Shift
                  </button>

                  <button
                    type="button"
                    onClick={onAddManualEntry}
                    className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <CalendarPlus className="h-5 w-5" />
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
                    <CalendarPlus className="h-5 w-5" />
                    Add Manual Entry
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SummaryCard
            title="Estimated Earnings"
            value={formatCurrency(projectedWeeklyPay)}
            hint={formatTrend(earningsTrend)}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="indigo"
          />
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
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              This week
            </span>
          </div>

          <div className="mt-8 grid h-[240px] grid-cols-7 items-end gap-3 sm:h-[280px]">
            {weeklyBars.map((bar) => (
              <div key={bar.label} className="flex h-full flex-col items-center justify-end gap-3">
                <div className="flex h-full w-full items-end justify-center rounded-2xl bg-slate-50 p-2">
                  <div
                    className="w-full rounded-2xl bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height: `${Math.max(bar.heightPercent, 8)}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-600">{bar.label}</p>
                  <p className="text-xs text-slate-400">{formatShortHours(bar.hours)}</p>
                </div>
              </div>
            ))}
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {entry.note || 'Shift entry'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatEntryDate(new Date(entry.start))} • {formatTimeRange(entry)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {formatDuration(getEntryDurationMs(entry) / HOUR_MS)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {entry.source}
                  </p>
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
  onDeleteEntry: (id: string) => void
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
          <CalendarPlus className="h-4.5 w-4.5" />
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
                  <button
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    className="mr-4 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    className="text-sm font-semibold text-rose-500 transition hover:text-rose-600"
                  >
                    Delete
                  </button>
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
                className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600"
              >
                Edit
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">
                  {formatDuration(getEntryDurationMs(entry) / HOUR_MS)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{entry.note || 'Shift entry'}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                {entry.source}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDeleteEntry(entry.id)}
              className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-rose-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReportsView({
  entries,
  hourlyRate,
  workerName
}: {
  entries: Entry[]
  hourlyRate: number
  workerName: string
}) {
  const [startDate, setStartDate] = useState(() => defaultReportStartDate())
  const [endDate, setEndDate] = useState(() => formatInputDate(new Date()))

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
  const projectedPay = currentPeriodHours * hourlyRate
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
    if (values.length === 0) {
      return 0
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [filteredEntries])
  const periodBars = useMemo(() => {
    const dailyDurations = buildDailyDurations(filteredEntries)

    return Object.entries(dailyDurations)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, hours]) => ({
        dateKey,
        hours,
        fullDate: formatEntryDate(new Date(`${dateKey}T12:00:00`))
      }))
  }, [filteredEntries])

  function handleGeneratePdf() {
    if (!rangeIsValid) {
      return
    }

    const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!reportWindow) {
      return
    }

    const rowsMarkup = filteredEntries
      .map((entry) => {
        const duration = formatDuration(getEntryDurationMs(entry) / HOUR_MS)

        return `
          <tr>
            <td>${escapeHtml(formatEntryDate(new Date(entry.start)))}</td>
            <td>${escapeHtml(formatTimeRange(entry))}</td>
            <td>${escapeHtml(duration)}</td>
            <td>${escapeHtml(entry.source)}</td>
            <td>${escapeHtml(entry.note || '—')}</td>
          </tr>
        `
      })
      .join('')

    reportWindow.document.write(`
      <html>
        <head>
          <title>Pay Period Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1, h2, p { margin: 0; }
            .meta, .totals { margin-top: 16px; }
            .totals div { margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.06em; }
          </style>
        </head>
        <body>
          <h1>Accountant Pay Period Report</h1>
          <div class="meta">
            <div><strong>Worker:</strong> ${escapeHtml(workerName || 'Not set')}</div>
            <div><strong>Period:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</div>
            <div><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString('en-US'))}</div>
          </div>
          <div class="totals">
            <div><strong>Total hours:</strong> ${escapeHtml(formatDuration(currentPeriodHours))}</div>
            <div><strong>Hourly rate:</strong> ${escapeHtml(formatCurrency(hourlyRate))}</div>
            <div><strong>Total pay:</strong> ${escapeHtml(formatCurrency(projectedPay))}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Source</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </body>
      </html>
    `)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Pay period</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
              Filter report range
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[420px]">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClassName}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {rangeIsValid
              ? `${filteredEntries.length} entries in selected pay period.`
              : 'Select a valid date range.'}
          </p>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={!rangeIsValid}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Generate Accountant PDF
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pay Period"
          value={formatDuration(currentPeriodHours)}
          hint="Tracked hours"
          icon={<ClockOutline className="h-5 w-5" />}
          tone="indigo"
        />
        <SummaryCard
          title="Projected Pay"
          value={formatCurrency(projectedPay)}
          hint="Using current hourly rate"
          icon={<WalletIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <SummaryCard
          title="Average Day"
          value={formatDuration(averageDailyHours)}
          hint="Across tracked days"
          icon={<ChartIcon className="h-5 w-5" />}
          tone="slate"
        />
        <SummaryCard
          title="Longest Shift"
          value={formatDuration(longestShiftHours)}
          hint="Single entry"
          icon={<BoltIcon className="h-5 w-5" />}
          tone="amber"
        />
      </div>

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
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{
                    width: `${Math.max(
                      periodBars.length > 0
                        ? (bar.hours / Math.max(...periodBars.map((item) => item.hours), 1)) * 100
                        : 0,
                      bar.hours > 0 ? 8 : 0
                    )}%`
                  }}
                />
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
    <div className="fixed inset-0 z-30 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-6">
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
            <CloseIcon className="h-5 w-5" />
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

function defaultReportStartDate() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? -13 : 1 - day - 7
  date.setDate(date.getDate() + diff)
  return formatInputDate(date)
}

function toInputTime(date: Date) {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-indigo-200 text-indigo-600">
        <ClockOutline className="h-4.5 w-4.5" />
      </div>
      <span
        className={`font-extrabold leading-none tracking-[-0.03em] text-indigo-600 ${
          compact ? 'text-2xl' : 'text-[1.9rem]'
        }`}
      >
        WorkClock
      </span>
    </div>
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
  label
}: {
  active: boolean
  href: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
        active
          ? 'bg-indigo-600 text-white shadow-[0_12px_30px_rgba(67,56,202,0.24)]'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

function MobileNavItem({
  active,
  href,
  icon,
  label
}: {
  active: boolean
  href: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
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
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
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

type IconProps = {
  className?: string
}

function ClockOutline({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 7.5v9l7-4.5-7-4.5Z" />
    </svg>
  )
}

function StopIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
    </svg>
  )
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m7 12.5 3.2 3.2L17 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  )
}

function CalendarPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
      <path d="M8 4.5v4M16 4.5v4M4.5 10.5h15M12 13v4M10 15h4" strokeLinecap="round" />
    </svg>
  )
}

function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="3.5" y="7" width="17" height="10" rx="2.5" />
      <path d="M6 7V5.7A1.7 1.7 0 0 1 7.7 4h7.8A1.5 1.5 0 0 1 17 5.5V7M15.5 12h2.5" strokeLinecap="round" />
    </svg>
  )
}

function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M13.5 3.5 8.8 11H13l-2.5 9.5L15.2 13H11l2.5-9.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GridIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  )
}

function ListIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M8 7h10M8 12h10M8 17h10M5 7h.01M5 12h.01M5 17h.01" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M5 19.5h14M8 16v-4M12 16V7.5M16 16v-6.5" strokeLinecap="round" />
      <rect x="6.5" y="10.5" width="3" height="5.5" rx="1" />
      <rect x="10.5" y="6" width="3" height="10" rx="1" />
      <rect x="14.5" y="8.5" width="3" height="7.5" rx="1" />
    </svg>
  )
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
      <path
        d="m19 12 .9-1.6-1.6-2.8-1.9.2a6.9 6.9 0 0 0-1.4-.8l-.8-1.7H9.8L9 7a6.9 6.9 0 0 0-1.4.8l-1.9-.2-1.6 2.8L5 12l-.9 1.6 1.6 2.8 1.9-.2c.43.33.9.6 1.4.8l.8 1.7h3.4l.8-1.7c.5-.2.97-.47 1.4-.8l1.9.2 1.6-2.8L19 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
