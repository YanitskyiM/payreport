'use client'

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createDefaultManualForm,
  createId,
  formatDuration,
  formatEntryDate,
  formatInputDate,
  formatTimeRange,
  getEntryDurationMs,
  HOUR_MS,
  type Entry,
  type ManualFormState,
} from '@/lib/workclock'

const inputClassName =
  'h-12 min-w-0 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

type EntryRow = {
  id: string
  start_at: string
  end_at: string
  source: Entry['source']
  note: string | null
}

function mapRowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    start: row.start_at,
    end: row.end_at,
    source: row.source,
    note: row.note ?? undefined,
  }
}

function toInputTime(date: Date) {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
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
  const entries = useMemo(() => rawEntries.map(mapRowToEntry), [rawEntries])

  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    createDefaultManualForm(new Date())
  )
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
                  {formatEntryDate(new Date(entry.start))}
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

function ManualEntryModal({
  entryLabel,
  error,
  form,
  isEditing,
  onChange,
  onClose,
  onSubmit,
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
                onChange={(e) => onChange((c) => ({ ...c, date: e.target.value }))}
                className={inputClassName}
                required
              />
            </Field>
            <Field label="Start">
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => onChange((c) => ({ ...c, startTime: e.target.value }))}
                className={inputClassName}
                required
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => onChange((c) => ({ ...c, endTime: e.target.value }))}
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <Field label="Note">
            <input
              type="text"
              value={form.note}
              onChange={(e) => onChange((c) => ({ ...c, note: e.target.value }))}
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
  onConfirm,
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
          Delete the entry for {formatEntryDate(new Date(entry.start))} (
          {formatTimeRange(entry)})? This action cannot be undone.
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
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}
