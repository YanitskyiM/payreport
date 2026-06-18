'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { workclockQueryKeys } from '@/lib/workclock-query-keys'
import {
  DEFAULT_SETTINGS,
  createDefaultManualForm,
  createId,
  formatElapsedTimer,
  formatInputDate,
  formatLongDate,
  formatTime,
  getPageTitle,
  getViewFromPathname,
  isDateInCurrentWeek,
  HOUR_MS,
  getEntryDurationMs,
  type View,
} from '@/lib/workclock'
import type { Entry, ManualFormState, PayReportAppProps, PendingShift, ProfileRow } from './workclock/types'
import { NAV_ITEMS } from './workclock/constants'
import { mapProfileToSettings, toInputTime } from './workclock/utils'
import { createWeekRange, fetchEntries, fetchEntriesInRange, fetchRecentEntries } from './workclock/data'
import { Brand } from './workclock/ui/Brand'
import { SidebarNavItem } from './workclock/ui/SidebarNavItem'
import { MobileNavItem } from './workclock/ui/MobileNavItem'
import { DashboardContentSkeleton } from './workclock/ui/DashboardSkeletons'
import { DashboardView } from './workclock/views/DashboardView'
import { EntriesView } from './workclock/views/EntriesView'
import { ReportsView } from './workclock/views/ReportsView'
import { SettingsView } from './workclock/views/SettingsView'
import { ManualEntryModal } from './workclock/modals/ManualEntryModal'
import { DeleteEntryModal } from './workclock/modals/DeleteEntryModal'

export function PayReportApp({ userEmail, userId, entriesSlot }: PayReportAppProps) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const routeLoadingTimeoutRef = useRef<number | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<Entry | null>(null)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const [pendingView, setPendingView] = useState<View | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [pendingShift, setPendingShift] = useState<PendingShift | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    createDefaultManualForm(new Date())
  )
  const currentView = getViewFromPathname(pathname)
  const usesClientEntriesView = currentView === 'entries' && !entriesSlot
  const isOverlayOpen = isManualEntryOpen || deleteEntryTarget !== null
  const entriesQueryKey = useMemo(() => workclockQueryKeys.entries(userId), [userId])
  const profileQueryKey = useMemo(() => workclockQueryKeys.profile(userId), [userId])
  const dashboardWeekRange = useMemo(() => createWeekRange(now), [now])
  const dashboardEntriesQueryKey = useMemo(
    () => workclockQueryKeys.dashboardEntries(userId, dashboardWeekRange.startIso, dashboardWeekRange.endExclusiveIso),
    [dashboardWeekRange.endExclusiveIso, dashboardWeekRange.startIso, userId]
  )
  const dashboardRecentEntriesQueryKey = useMemo(
    () => workclockQueryKeys.dashboardRecentEntries(userId),
    [userId]
  )
  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchOrCreateProfile,
  })
  const entriesQuery = useQuery({
    enabled: usesClientEntriesView,
    queryKey: entriesQueryKey,
    queryFn: () => fetchEntries(supabase, userId),
  })
  const dashboardEntriesQuery = useQuery({
    enabled: currentView === 'dashboard',
    queryKey: dashboardEntriesQueryKey,
    queryFn: () => fetchEntriesInRange(supabase, userId, dashboardWeekRange),
  })
  const dashboardRecentEntriesQuery = useQuery({
    enabled: currentView === 'dashboard',
    queryKey: dashboardRecentEntriesQueryKey,
    queryFn: () => fetchRecentEntries(supabase, userId),
  })
  const entries =
    currentView === 'dashboard'
      ? dashboardEntriesQuery.data ?? []
      : usesClientEntriesView
        ? entriesQuery.data ?? []
        : []
  const loadError =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : usesClientEntriesView && entriesQuery.error instanceof Error
        ? entriesQuery.error.message
        : currentView === 'dashboard' && dashboardEntriesQuery.error instanceof Error
          ? dashboardEntriesQuery.error.message
          : currentView === 'dashboard' && dashboardRecentEntriesQuery.error instanceof Error
            ? dashboardRecentEntriesQuery.error.message
        : null
  const isBusy =
    profileQuery.isLoading ||
    (usesClientEntriesView && entriesQuery.isLoading) ||
    (currentView === 'dashboard' &&
      (dashboardEntriesQuery.isLoading || dashboardRecentEntriesQuery.isLoading))

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
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
    if (profileQuery.data) {
      setSettings(mapProfileToSettings(profileQuery.data))
    }
  }, [profileQuery.data])

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
    setPendingView(null)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    if (!isOverlayOpen) return

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
    () => [...entries].sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime()),
    [entries]
  )

  const currentWeekEntries = useMemo(
    () => sortedEntries.filter((entry) => isDateInCurrentWeek(new Date(entry.start), now)),
    [now, sortedEntries]
  )

  const activeShiftDurationMs = settings.activeShiftStart
    ? Math.max(0, now.getTime() - new Date(settings.activeShiftStart).getTime())
    : pendingShift
      ? Math.max(0, new Date(pendingShift.end).getTime() - new Date(pendingShift.start).getTime())
      : 0

  const weekHours = useMemo(() => {
    const totalMs = currentWeekEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0)
    return (totalMs + activeShiftDurationMs) / HOUR_MS
  }, [activeShiftDurationMs, currentWeekEntries])

  const weeklyGoalProgress =
    settings.weeklyGoalHours <= 0 ? 0 : weekHours / settings.weeklyGoalHours
  const recentEntries =
    currentView === 'dashboard' ? dashboardRecentEntriesQuery.data ?? [] : sortedEntries.slice(0, 4)
  const activeView = isRouteLoading && pendingView ? pendingView : currentView
  const pageTitle = getPageTitle(activeView)

  function handleNavigationStart(href: string) {
    if (href !== pathname) {
      setPendingView(getViewFromPathname(href))
      if (routeLoadingTimeoutRef.current !== null) {
        window.clearTimeout(routeLoadingTimeoutRef.current)
      }
      routeLoadingTimeoutRef.current = window.setTimeout(() => {
        setIsRouteLoading(true)
        routeLoadingTimeoutRef.current = null
      }, 180)
    }
  }

  async function fetchOrCreateProfile(): Promise<ProfileRow> {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, overworks_rate, active_shift_start')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (data) return data

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
        active_shift_start: null,
      })
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, overworks_rate, active_shift_start')
      .single()

    if (insertError) throw insertError
    return inserted
  }

  async function handleStartShift() {
    setSettingsNotice(null)
    const nextStart = now.toISOString()
    const { error } = await supabase.from('profiles').update({ active_shift_start: nextStart }).eq('user_id', userId)
    if (error) { setSettingsNotice(error.message); return }
    setPendingShift(null)
    setSettings((current) => ({ ...current, activeShiftStart: nextStart }))
    void queryClient.invalidateQueries({ queryKey: profileQueryKey })
  }

  async function handleStopShift() {
    if (!settings.activeShiftStart) return
    setSettingsNotice(null)
    const end = now.toISOString()
    const { error } = await supabase.from('profiles').update({ active_shift_start: null }).eq('user_id', userId)
    if (error) { setSettingsNotice(error.message); return }
    setPendingShift({ start: settings.activeShiftStart, end })
    setSettings((current) => ({ ...current, activeShiftStart: null }))
    void queryClient.invalidateQueries({ queryKey: profileQueryKey })
  }

  async function handleContinueShift() {
    if (!pendingShift) return
    setSettingsNotice(null)
    const { error } = await supabase
      .from('profiles')
      .update({ active_shift_start: pendingShift.start })
      .eq('user_id', userId)
    if (error) { setSettingsNotice(error.message); return }
    setPendingShift(null)
    setSettings((current) => ({ ...current, activeShiftStart: pendingShift.start }))
    void queryClient.invalidateQueries({ queryKey: profileQueryKey })
  }

  async function handleSavePendingShift() {
    if (!pendingShift) return
    setSettingsNotice(null)

    const nextEntry: Entry = {
      id: createId(),
      start: pendingShift.start,
      end: pendingShift.end,
      source: 'timer',
      note: 'Tracked shift',
    }

    const { error } = await supabase.from('time_entries').insert({
      id: nextEntry.id,
      user_id: userId,
      start_at: nextEntry.start,
      end_at: nextEntry.end,
      source: nextEntry.source,
      note: nextEntry.note ?? null,
    })

    if (error) { setSettingsNotice(error.message); return }
    syncSavedEntry(nextEntry)
    setPendingShift(null)
    invalidateEntryQueries()
  }

  function handleRequestDeleteEntry(entry: Entry) {
    setDeleteEntryTarget(entry)
  }

  function invalidateEntryQueries() {
    workclockQueryKeys.entryCollections(userId).forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey })
    })
  }

  function sortEntriesByStart(nextEntries: Entry[]) {
    return [...nextEntries].sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime())
  }

  function upsertEntry(entriesToUpdate: Entry[], entry: Entry) {
    const nextEntries = entriesToUpdate.some((currentEntry) => currentEntry.id === entry.id)
      ? entriesToUpdate.map((currentEntry) => (currentEntry.id === entry.id ? entry : currentEntry))
      : [entry, ...entriesToUpdate]

    return sortEntriesByStart(nextEntries)
  }

  function updateCachedEntries(
    queryKey: readonly unknown[],
    updater: (currentEntries: Entry[]) => Entry[]
  ) {
    queryClient.setQueryData<Entry[]>(queryKey, (currentEntries) =>
      currentEntries ? updater(currentEntries) : currentEntries
    )
  }

  function syncSavedEntry(entry: Entry) {
    updateCachedEntries(entriesQueryKey, (currentEntries) => upsertEntry(currentEntries, entry))
    updateCachedEntries(dashboardEntriesQueryKey, (currentEntries) =>
      isDateInCurrentWeek(new Date(entry.start), now)
        ? upsertEntry(currentEntries, entry)
        : currentEntries.filter((currentEntry) => currentEntry.id !== entry.id)
    )
    updateCachedEntries(dashboardRecentEntriesQueryKey, (currentEntries) =>
      upsertEntry(currentEntries, entry).slice(0, 4)
    )
  }

  function syncDeletedEntry(entryId: string) {
    const removeEntry = (currentEntries: Entry[]) =>
      currentEntries.filter((entry) => entry.id !== entryId)

    updateCachedEntries(entriesQueryKey, removeEntry)
    updateCachedEntries(dashboardEntriesQueryKey, removeEntry)
    updateCachedEntries(dashboardRecentEntriesQueryKey, removeEntry)
  }

  async function handleDeleteEntry(id: string) {
    const previousEntries = queryClient.getQueryData<Entry[]>(entriesQueryKey)
    const previousDashboardEntries = queryClient.getQueryData<Entry[]>(dashboardEntriesQueryKey)
    const previousRecentEntries = queryClient.getQueryData<Entry[]>(dashboardRecentEntriesQueryKey)
    setIsDeletingEntry(true)
    syncDeletedEntry(id)

    const { error } = await supabase.from('time_entries').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      queryClient.setQueryData(entriesQueryKey, previousEntries)
      queryClient.setQueryData(dashboardEntriesQueryKey, previousDashboardEntries)
      queryClient.setQueryData(dashboardRecentEntriesQueryKey, previousRecentEntries)
      setSettingsNotice(error.message)
    } else {
      invalidateEntryQueries()
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
      note: entry.note ?? '',
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
      note: manualForm.note.trim() || 'Manual entry',
    }

    const { error } = editingEntryId
      ? await supabase
          .from('time_entries')
          .update({
            start_at: nextEntry.start,
            end_at: nextEntry.end,
            source: nextEntry.source,
            note: nextEntry.note ?? null,
          })
          .eq('id', editingEntryId)
          .eq('user_id', userId)
      : await supabase.from('time_entries').insert({
          id: nextEntry.id,
          user_id: userId,
          start_at: nextEntry.start,
          end_at: nextEntry.end,
          source: nextEntry.source,
          note: nextEntry.note ?? null,
        })

    if (error) { setManualError(error.message); return }

    syncSavedEntry(nextEntry)
    setIsManualEntryOpen(false)
    invalidateEntryQueries()
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
        overworks_rate: settings.overworksRate,
      })
      .eq('user_id', userId)

    if (error) { setSettingsNotice(error.message); return }

    setSettingsNotice('Settings saved to Supabase.')
    void queryClient.invalidateQueries({ queryKey: profileQueryKey })
    window.setTimeout(() => setSettingsNotice(null), 2500)
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden w-[280px] shrink-0 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)]">
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
                    active={activeView === item.view}
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
                {settings.activeShiftStart ? formatElapsedTimer(activeShiftDurationMs) : 'Off shift'}
              </p>
              <p className="mt-2 text-sm text-indigo-100">
                {settings.activeShiftStart
                  ? `Started ${formatTime(new Date(settings.activeShiftStart))}`
                  : 'Start a shift to track hours live.'}
              </p>
            </section>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 lg:px-8">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <div className="lg:hidden">
                <div className="flex items-start justify-between gap-4">
                  <Brand compact />
                  <p className="max-w-36 pt-0.5 text-right text-[0.68rem] font-bold uppercase leading-[1.45] tracking-[0.28em] text-slate-500">
                    {formatLongDate(now)}
                  </p>
                </div>

                <h1 className="mt-5 text-[1.85rem] font-extrabold leading-none tracking-[-0.06em] text-slate-900">
                  {pageTitle}
                </h1>
              </div>

              <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-4">
                <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-slate-500">
                  {formatLongDate(now)}
                </p>

                <div className="flex-1 text-center">
                  <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-slate-900">
                    {pageTitle}
                  </h1>
                </div>

                <div className="min-w-[220px] rounded-2xl bg-slate-50 px-4 py-3 text-right">
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

            {isBusy || isRouteLoading ? (
              <DashboardContentSkeleton view={activeView} />
            ) : null}

            {!isBusy && !isRouteLoading && currentView === 'dashboard' ? (
              <DashboardView
                activeShiftDurationMs={activeShiftDurationMs}
                activeShiftStart={settings.activeShiftStart}
                pendingShift={pendingShift}
                entries={sortedEntries}
                now={now}
                onAddManualEntry={handleOpenNewManualEntry}
                onContinueShift={() => void handleContinueShift()}
                onSaveShift={() => void handleSavePendingShift()}
                onStartShift={() => void handleStartShift()}
                onStopShift={() => void handleStopShift()}
                recentEntries={recentEntries}
                settings={settings}
                weekHours={weekHours}
                weeklyGoalProgress={weeklyGoalProgress}
                onDeleteEntry={handleRequestDeleteEntry}
                onEditEntry={handleEditEntry}
                userId={userId}
              />
            ) : null}

            {!isBusy && !isRouteLoading && currentView === 'entries' ? (
              entriesSlot ?? (
                <EntriesView
                  entries={sortedEntries}
                  onAddManualEntry={handleOpenNewManualEntry}
                  onDeleteEntry={handleRequestDeleteEntry}
                  onEditEntry={handleEditEntry}
                />
              )
            ) : null}

            {!isBusy && !isRouteLoading && currentView === 'reports' ? (
              <ReportsView
                hourlyRate={settings.hourlyRate}
                weeklyGoalHours={settings.weeklyGoalHours}
                overworksRate={settings.overworksRate}
                workerName={settings.workerName}
                userId={userId}
              />
            ) : null}

            {!isBusy && !isRouteLoading && currentView === 'settings' ? (
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
              active={activeView === item.view}
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
            if (!isDeletingEntry) setDeleteEntryTarget(null)
          }}
          onConfirm={() => void handleDeleteEntry(deleteEntryTarget.id)}
        />
      ) : null}
    </main>
  )
}
