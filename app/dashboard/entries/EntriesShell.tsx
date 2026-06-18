'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'
import { DeleteEntryModal } from '@/components/workclock/modals/DeleteEntryModal'
import { ManualEntryModal } from '@/components/workclock/modals/ManualEntryModal'
import type { Entry, EntryRow, ManualFormState } from '@/components/workclock/types'
import { mapRowToEntry, toInputTime } from '@/components/workclock/utils'
import { createClient } from '@/lib/supabase/client'
import { workclockQueryKeys } from '@/lib/workclock-query-keys'
import {
  createDefaultManualForm,
  createId,
  formatDuration,
  formatEntryDate,
  formatInputDate,
  formatTimeRange,
  getEntryDurationMs,
  HOUR_MS,
} from '@/lib/workclock'

function formatDayOfWeek(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function EntriesShell({
  entries: rawEntries,
  page,
  totalPages,
  totalCount,
  userId,
}: {
  entries: EntryRow[]
  page: number
  totalPages: number
  totalCount: number
  userId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const entries = useMemo(() => rawEntries.map(mapRowToEntry), [rawEntries])

  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    createDefaultManualForm(new Date())
  )
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function invalidateEntryQueries() {
    workclockQueryKeys.entryCollections(userId).forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey })
    })
  }

  function handleOpenAddEntry() {
    setEditingEntryId(null)
    setManualError(null)
    setManualForm(createDefaultManualForm(new Date()))
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
        ? (entries.find((e) => e.id === editingEntryId)?.source ?? 'manual')
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

    if (error) {
      setManualError(error.message)
      return
    }

    setIsManualEntryOpen(false)
    invalidateEntryQueries()
    router.refresh()
  }

  async function handleDeleteEntry(id: string) {
    setIsDeleting(true)
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    setIsDeleting(false)

    if (!error) {
      setDeleteTarget(null)
      invalidateEntryQueries()
      router.refresh()
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Work log</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
            All entries
          </h2>
          {totalCount > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              {totalCount} total · page {page} of {totalPages}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenAddEntry}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <CalendarDaysIcon className="h-4.5 w-4.5" />
          Add Manual Entry
        </button>
      </div>

      {/* Desktop table */}
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
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                    {formatEntryDate(new Date(entry.start))}{' '}
                    <span className="font-normal text-slate-400">
                      ({formatDayOfWeek(new Date(entry.start))})
                    </span>
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
                        onClick={() => handleEditEntry(entry)}
                        aria-label="Edit entry"
                        title="Edit entry"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="Delete entry"
                        title="Delete entry"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 lg:hidden">
        {entries.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">No entries found.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {formatEntryDate(new Date(entry.start))}{' '}
                  <span className="font-normal text-slate-400">
                    ({formatDayOfWeek(new Date(entry.start))})
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatTimeRange(entry)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleEditEntry(entry)}
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
                  onClick={() => setDeleteTarget(entry)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <Link
            href={`/dashboard/entries?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400">
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={`/dashboard/entries?page=${item}`}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                      item === page
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
          </div>

          <Link
            href={`/dashboard/entries?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}

      {isManualEntryOpen && (
        <ManualEntryModal
          entryLabel={editingEntryId ? 'Edit entry' : 'Create entry'}
          error={manualError}
          form={manualForm}
          isEditing={Boolean(editingEntryId)}
          onChange={setManualForm}
          onClose={() => setIsManualEntryOpen(false)}
          onSubmit={(event) => void handleSubmitManualEntry(event)}
        />
      )}

      {deleteTarget && (
        <DeleteEntryModal
          entry={deleteTarget}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) setDeleteTarget(null)
          }}
          onConfirm={() => void handleDeleteEntry(deleteTarget.id)}
        />
      )}
    </section>
  )
}
