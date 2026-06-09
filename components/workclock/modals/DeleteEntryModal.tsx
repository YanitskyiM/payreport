'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { formatEntryDate, formatTimeRange } from '@/lib/workclock'
import type { Entry } from '../types'

type DeleteEntryModalProps = {
  entry: Entry
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteEntryModal({ entry, isDeleting, onCancel, onConfirm }: DeleteEntryModalProps) {
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
