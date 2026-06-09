'use client'

import { CalendarDaysIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  HOUR_MS,
  formatDuration,
  formatEntryDate,
  formatTimeRange,
  getEntryDurationMs,
} from '@/lib/workclock'
import type { Entry } from '../types'

type EntriesViewProps = {
  entries: Entry[]
  onAddManualEntry: () => void
  onDeleteEntry: (entry: Entry) => void
  onEditEntry: (entry: Entry) => void
}

export function EntriesView({ entries, onAddManualEntry, onDeleteEntry, onEditEntry }: EntriesViewProps) {
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
