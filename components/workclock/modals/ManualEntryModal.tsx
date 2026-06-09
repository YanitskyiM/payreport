'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ManualFormState } from '../types'
import { Field } from '../ui/Field'
import { inputClassName } from '../constants'

type ManualEntryModalProps = {
  entryLabel: string
  error: string | null
  form: ManualFormState
  isEditing: boolean
  onChange: Dispatch<SetStateAction<ManualFormState>>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ManualEntryModal({
  entryLabel,
  error,
  form,
  isEditing,
  onChange,
  onClose,
  onSubmit,
}: ManualEntryModalProps) {
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
