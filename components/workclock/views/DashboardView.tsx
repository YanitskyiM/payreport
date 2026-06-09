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
import { useMemo, useState } from 'react'
import {
  HOUR_MS,
  buildWeeklyChartData,
  formatDuration,
  formatElapsedTimer,
  formatEntryDate,
  formatShortHours,
  formatTimeRange,
  getEntryDurationMs,
  getStartOfWeek,
  goalHint,
} from '@/lib/workclock'
import type { Entry, PendingShift, Settings } from '../types'
import { SummaryCard } from '../ui/SummaryCard'

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
}: DashboardViewProps) {
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
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
