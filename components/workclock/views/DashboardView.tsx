'use client'

import {
  BoltIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  PencilSquareIcon,
  PlayIcon,
  StopCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HOUR_MS,
  buildWeeklyChartData,
  formatDuration,
  formatElapsedTimer,
  formatEntryDate,
  formatShortHours,
  formatTime,
  formatTimeRange,
  getEntryDurationMs,
  getStartOfWeek,
} from '@/lib/workclock'
import { workclockQueryKeys } from '@/lib/workclock-query-keys'
import type { Entry, PendingShift, Settings } from '../types'
import { createWeekRange, fetchEntriesInRange } from '../data'

type DashboardViewProps = {
  activeShiftDurationMs: number
  activeShiftStart: string | null
  pendingShift: PendingShift | null
  entries: Entry[]
  now: Date
  onAddManualEntry: () => void
  onContinueShift: () => void
  onSaveShift: () => void
  onStartShift: () => void
  onStopShift: () => void
  recentEntries: Entry[]
  settings: Settings
  weekHours: number
  weeklyGoalProgress: number
  onDeleteEntry: (entry: Entry) => void
  onEditEntry: (entry: Entry) => void
  userId: string
}

export function DashboardView({
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
  onEditEntry,
  userId,
}: DashboardViewProps) {
  const supabase = useMemo(() => createClient(), [])
  const [weekOffset, setWeekOffset] = useState(0)

  const chartNow = useMemo(() => {
    if (weekOffset === 0) return now
    const d = new Date(now)
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [now, weekOffset])
  const chartWeekRange = useMemo(() => createWeekRange(chartNow), [chartNow])
  const historicalWeekEntriesQuery = useQuery({
    enabled: weekOffset !== 0,
    queryKey: workclockQueryKeys.dashboardEntries(
      userId,
      chartWeekRange.startIso,
      chartWeekRange.endExclusiveIso
    ),
    queryFn: () => fetchEntriesInRange(supabase, userId, chartWeekRange),
  })
  const chartEntries = weekOffset === 0 ? entries : historicalWeekEntriesQuery.data ?? []

  const weeklyBars = useMemo(
    () => buildWeeklyChartData(chartEntries, chartNow, weekOffset === 0 ? activeShiftDurationMs : 0),
    [activeShiftDurationMs, chartEntries, chartNow, weekOffset]
  )

  const weekLabel = useMemo(() => {
    const start = getStartOfWeek(chartNow)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    if (weekOffset === 0) return 'This week'
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  }, [chartNow, weekOffset])

  const progressPct = Math.max(0, Math.min(weeklyGoalProgress, 1))

  return (
    <section className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">

        {/* Timer card */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center gap-5 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-indigo-100 text-indigo-600">
            <ClockIcon className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Live Session
            </p>
            <p className="mt-3 text-6xl font-extrabold tracking-[-0.06em] text-slate-900 tabular-nums sm:text-7xl">
              {formatElapsedTimer(activeShiftDurationMs)}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {activeShiftStart
                ? `Started at ${formatTime(new Date(activeShiftStart))}`
                : pendingShift
                ? 'Paused'
                : 'Not running'}
            </p>
          </div>

          <div className="flex w-full max-w-sm gap-3">
            {activeShiftStart ? (
              <>
                <button
                  type="button"
                  onClick={onStopShift}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-rose-600"
                >
                  <StopCircleIcon className="h-5 w-5" />
                  Stop Shift
                </button>
                <button
                  type="button"
                  onClick={onAddManualEntry}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                  Manual Entry
                </button>
              </>
            ) : pendingShift ? (
              <>
                <button
                  type="button"
                  onClick={onContinueShift}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-indigo-700"
                >
                  <PlayIcon className="h-5 w-5" />
                  Continue
                </button>
                <button
                  type="button"
                  onClick={onSaveShift}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-bold text-white shadow-[0_14px_35px_rgba(16,185,129,0.2)] transition hover:bg-emerald-600"
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
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-indigo-700"
                >
                  <PlayIcon className="h-5 w-5" />
                  Start Shift
                </button>
                <button
                  type="button"
                  onClick={onAddManualEntry}
                  className="flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                  Manual Entry
                </button>
              </>
            )}
          </div>
        </div>

        {/* Weekly goal card */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-6 w-full sm:w-[380px]">
          <div className="flex items-center justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <BoltIcon className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
              {weeklyGoalProgress >= 1 ? 'Complete' : 'In progress'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative grid place-items-center">
              <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
                <circle cx="90" cy="90" r="76" fill="none" stroke="#e0e7ff" strokeWidth="14" />
                <circle
                  cx="90" cy="90" r="76"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 76}
                  strokeDashoffset={2 * Math.PI * 76 * (1 - progressPct)}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold tracking-[-0.04em] text-slate-900">
                  {Math.round(progressPct * 100)}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Progress
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Weekly Goal ({settings.weeklyGoalHours}h)
              </p>
              <p className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-slate-900">
                {formatDuration(weekHours)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
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
              <span className="w-[116px] whitespace-nowrap text-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
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
                    className="flex w-full flex-col items-stretch justify-end"
                    style={{ height: `${Math.max(bar.heightPercent, bar.hours > 0 ? 8 : 0)}%` }}
                  >
                    {bar.overtimeHeightPercent > 0 && (
                      <div
                        className="w-full shrink-0 rounded-t-xl bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-300"
                        style={{ height: `${(bar.overtimeHeightPercent / bar.heightPercent) * 100}%` }}
                      />
                    )}
                    <div
                      className={`w-full shrink-0 bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300 ${bar.overtimeHeightPercent > 0 ? 'rounded-b-xl' : 'rounded-xl'}`}
                      style={{ height: `${(bar.regularHeightPercent / bar.heightPercent) * 100}%` }}
                    />
                  </div>
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
            <Link
              href="/dashboard/entries"
              className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-600 sm:inline-flex"
            >
              {recentEntries.length} items · View all
            </Link>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 sm:hidden">
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
                    {new Date(entry.start).toLocaleDateString('en-US', { weekday: 'long' })}
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

          <Link
            href="/dashboard/entries"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-600 sm:hidden"
          >
            View all
          </Link>
        </section>
      </div>
    </section>
  )
}
