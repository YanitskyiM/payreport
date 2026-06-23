'use client'

import { BellIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState } from 'react'
import { inputClassName } from '../constants'

type ReminderSettings = {
  clockInEnabled: boolean
  clockInTime: string
  clockOutEnabled: boolean
  clockOutTime: string
  timezone: string
}

const DEFAULT: ReminderSettings = {
  clockInEnabled: false,
  clockInTime: '09:00',
  clockOutEnabled: false,
  clockOutTime: '18:00',
  timezone: 'UTC',
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-indigo-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function ScheduledNotificationsPanel() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/push/reminders')
      if (res.ok) {
        const json = await res.json()
        const r = json.reminders
        if (r) {
          setSettings({
            clockInEnabled: r.clock_in_reminder_enabled ?? false,
            clockInTime: r.clock_in_reminder_time ?? '09:00',
            clockOutEnabled: r.clock_out_reminder_enabled ?? false,
            clockOutTime: r.clock_out_reminder_time ?? '18:00',
            timezone: r.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/push/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          // Always refresh timezone to current browser timezone on save
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Failed to save')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Reminders respect your local timezone:{' '}
        <span className="font-semibold text-slate-600">{tz}</span>
      </p>

      {/* ── Clock-in reminder ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
              <BellIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Clock-in reminder</p>
              <p className="mt-0.5 text-xs text-slate-500">
                &ldquo;Time to start your shift!&rdquo; — fires if no active session at this time.
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.clockInEnabled}
            onChange={(v) => setSettings((s) => ({ ...s, clockInEnabled: v }))}
            label="Enable clock-in reminder"
          />
        </div>
        {settings.clockInEnabled && (
          <div className="mt-4 flex items-center gap-3">
            <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Reminder time
              </label>
              <input
                type="time"
                value={settings.clockInTime}
                onChange={(e) => setSettings((s) => ({ ...s, clockInTime: e.target.value }))}
                className={inputClassName}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Clock-out / log-time reminder ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <BellIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Clock-out reminder</p>
              <p className="mt-0.5 text-xs text-slate-500">
                &ldquo;Still clocked in!&rdquo; — fires if a shift is <strong>still running</strong> at
                this time.
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.clockOutEnabled}
            onChange={(v) => setSettings((s) => ({ ...s, clockOutEnabled: v }))}
            label="Enable log-time reminder"
          />
        </div>
        {settings.clockOutEnabled && (
          <div className="mt-4 flex items-center gap-3">
            <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Reminder time
              </label>
              <input
                type="time"
                value={settings.clockOutTime}
                onChange={(e) => setSettings((s) => ({ ...s, clockOutTime: e.target.value }))}
                className={inputClassName}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save reminder settings'}
      </button>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700">Reminder settings saved.</p>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}
