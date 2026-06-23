'use client'

import { useRef, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { formatCurrency } from '@/lib/workclock'
import type { Settings } from '../types'
import { Field } from '../ui/Field'
import { SettingsMetric } from '../ui/SettingsMetric'
import { inputClassName } from '../constants'
import { LogoutConfirmModal } from '../modals/LogoutConfirmModal'
import { PushNotificationPanel } from '../ui/PushNotificationPanel'
import { ScheduledNotificationsPanel } from '../ui/ScheduledNotificationsPanel'

type SettingsViewProps = {
  notice: string | null
  onSave: (event: FormEvent<HTMLFormElement>) => void
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  userEmail: string
}

export function SettingsView({ notice, onSave, settings, setSettings, userEmail }: SettingsViewProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const logoutFormRef = useRef<HTMLFormElement>(null)

  function handleLogoutConfirm() {
    logoutFormRef.current?.submit()
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={onSave}
        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <p className="text-sm font-semibold text-slate-500">Preferences</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Time tracking settings
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Worker name">
            <input
              value={settings.workerName}
              onChange={(event) =>
                setSettings((current) => ({ ...current, workerName: event.target.value }))
              }
              className={inputClassName}
              placeholder="Your name"
            />
          </Field>

          <Field label="Hourly rate">
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.hourlyRate}
              onChange={(event) =>
                setSettings((current) => ({ ...current, hourlyRate: Number(event.target.value) }))
              }
              className={inputClassName}
            />
          </Field>

          <Field label="Weekly goal (hours)">
            <input
              type="number"
              min="1"
              step="0.5"
              value={settings.weeklyGoalHours}
              onChange={(event) =>
                setSettings((current) => ({ ...current, weeklyGoalHours: Number(event.target.value) }))
              }
              className={inputClassName}
            />
          </Field>

          <Field label="Overworks rate (×)">
            <input
              type="number"
              min="1"
              step="0.05"
              value={settings.overworksRate}
              onChange={(event) =>
                setSettings((current) => ({ ...current, overworksRate: Number(event.target.value) }))
              }
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Save Settings
          </button>
        </div>

        {notice ? <p className="mt-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}
      </form>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-500">Profile summary</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Active configuration
        </h2>
        <div className="mt-6 space-y-4">
          <SettingsMetric label="Email" value={userEmail || 'Not available'} />
          <SettingsMetric label="Worker" value={settings.workerName || 'Not set'} />
          <SettingsMetric label="Hourly rate" value={formatCurrency(settings.hourlyRate)} />
          <SettingsMetric label="Weekly goal" value={`${settings.weeklyGoalHours.toFixed(1)} hours`} />
          <SettingsMetric label="Overworks rate" value={`${settings.overworksRate.toFixed(2)}×`} />
          <SettingsMetric label="Storage" value="Supabase cloud database" />
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">Session</p>
          <form ref={logoutFormRef} action="/auth/signout" method="post" className="mt-3">
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              Sign Out
            </button>
          </form>
        </div>
      </section>

      {/* Push notifications — full width below the two-column section */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
        <p className="text-sm font-semibold text-slate-500">Push Notifications</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Device subscriptions &amp; test
        </h2>
        <div className="mt-6">
          <PushNotificationPanel />
        </div>
      </section>

      {/* Scheduled reminders — full width */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
        <p className="text-sm font-semibold text-slate-500">Scheduled Reminders</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Automatic notifications
        </h2>
        <div className="mt-6">
          <ScheduledNotificationsPanel />
        </div>
      </section>

      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleLogoutConfirm}
        />
      )}
    </section>
  )
}
