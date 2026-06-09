'use client'

import { BoltIcon, ChartBarIcon, ChevronDownIcon, ClockIcon, QueueListIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import {
  HOUR_MS,
  buildDailyDurations,
  formatDuration,
  formatEntryDate,
  formatInputDate,
  formatShortHours,
  getEntryDurationMs,
  getStartOfWeek,
} from '@/lib/workclock'
import type { Entry } from '../types'
import { SummaryCard } from '../ui/SummaryCard'
import { PayBreakdownCard } from '../ui/PayBreakdownCard'
import { Field } from '../ui/Field'
import { inputClassName } from '../constants'
import {
  buildReportPresetRanges,
  filterEntriesByRange,
  formatReportRangeLabel,
  getEndOfWeek,
} from '../report-utils'
import { createPayPeriodPdf } from '../pdf'

type ReportsViewProps = {
  entries: Entry[]
  hourlyRate: number
  weeklyGoalHours: number
  overworksRate: number
  workerName: string
}

export function ReportsView({ entries, hourlyRate, weeklyGoalHours, overworksRate, workerName }: ReportsViewProps) {
  const [startDate, setStartDate] = useState(() => formatInputDate(getStartOfWeek(new Date())))
  const [endDate, setEndDate] = useState(() => formatInputDate(getEndOfWeek(new Date())))
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>('This week')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filteredEntries = useMemo(
    () => filterEntriesByRange(entries, startDate, endDate),
    [entries, startDate, endDate]
  )

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
    if (!startDate || !endDate || endDate < startDate) return []
    const dailyDurations = buildDailyDurations(filteredEntries)
    const bars = []
    const cursor = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)
    while (cursor <= end) {
      const dateKey = formatInputDate(cursor)
      bars.push({
        dateKey,
        hours: dailyDurations[dateKey] ?? 0,
        fullDate: formatEntryDate(cursor),
        weekday: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return bars
  }, [filteredEntries, startDate, endDate])

  const reportRangeLabel = rangeIsValid ? formatReportRangeLabel(startDate, endDate) : 'Select a valid range'
  const periodLabel = activePresetLabel ?? reportRangeLabel
  const presetRanges = useMemo(() => buildReportPresetRanges(), [])

  function handleGeneratePdf() {
    if (!rangeIsValid) return
    createPayPeriodPdf({ endDate, entries: filteredEntries, startDate, workerName })
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
          title="Toral  Hours"
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
        <PayBreakdownCard
          regularHours={regularTrackedHours}
          overtimeHours={overtimeHours}
          regularPay={regularPay}
          overtimePay={overtimePay}
          hourlyRate={hourlyRate}
          overworksRate={overworksRate}
          hint={periodLabel}
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
              className="grid h-[280px] gap-2 sm:h-[320px]"
              style={{
                gridTemplateColumns: `repeat(${periodBars.length}, minmax(44px, 1fr))`,
                minWidth: `${Math.max(periodBars.length * 52, 100)}px`,
              }}
            >
              {(() => {
                const peak = Math.max(...periodBars.map((b) => b.hours), 1)
                return periodBars.map((bar) => {
                  const regularH = (Math.min(bar.hours, 8) / peak) * 100
                  const overtimeH = (Math.max(bar.hours - 8, 0) / peak) * 100
                  const minH = bar.hours > 0 ? 6 : 0
                  return (
                    <div key={bar.dateKey} className="flex h-full flex-col items-center gap-1.5">
                      <div className="flex w-full flex-1 items-end justify-center rounded-xl bg-slate-50 p-1">
                        <div
                          className="flex w-full flex-col items-stretch justify-end"
                          style={{ height: `${Math.max(regularH + overtimeH, minH)}%` }}
                        >
                          {overtimeH > 0 && (
                            <div
                              className="w-full shrink-0 rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-300"
                              style={{ height: `${(overtimeH / (regularH + overtimeH)) * 100}%` }}
                            />
                          )}
                          <div
                            className={`w-full shrink-0 bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300 ${overtimeH > 0 ? 'rounded-b-lg' : 'rounded-lg'}`}
                            style={{ height: `${(regularH / (regularH + overtimeH || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-center">
                        <p className="text-[10px] font-bold text-slate-600">{bar.weekday}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(`${bar.dateKey}T12:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {bar.hours > 0 ? formatShortHours(bar.hours) : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })
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
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                {(() => {
                  const peak = Math.max(...periodBars.map((item) => item.hours), 1)
                  const normalHours = Math.min(bar.hours, 8)
                  const barOvertimeHours = Math.max(bar.hours - 8, 0)
                  const normalWidth = periodBars.length > 0 ? (normalHours / peak) * 100 : 0
                  const overtimeWidth = periodBars.length > 0 ? (barOvertimeHours / peak) * 100 : 0
                  return (
                    <div className="flex h-full">
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${Math.max(normalWidth, bar.hours > 0 ? 8 : 0)}%` }}
                      />
                      {barOvertimeHours > 0 && (
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
