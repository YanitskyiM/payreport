'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

type LogoutConfirmModalProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({ onCancel, onConfirm }: LogoutConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-rose-500">Sign out</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
              Confirm sign out
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Are you sure you want to sign out? Any unsaved changes will be lost.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
