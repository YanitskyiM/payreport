'use client'

import { BellIcon, BellSlashIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushNotificationCard() {
  const { isSupported, isStandalone, permission, isSubscribed, isPending, error, enable, disable } =
    usePushNotifications()

  // Not installed as PWA — show install prompt (iOS requires Home Screen install)
  if (!isStandalone) {
    return (
      <div className="rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
            <DevicePhoneMobileIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Push Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Add PayReport to your Home Screen to enable push notifications.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Browser does not support push at all
  if (!isSupported) {
    return (
      <div className="rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-200 text-slate-400">
            <BellSlashIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Push Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Not supported on this browser. Try Safari on iOS 16.4+.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // User explicitly blocked notifications
  if (permission === 'denied') {
    return (
      <div className="rounded-3xl bg-rose-50 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-500">
            <BellSlashIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Notifications Blocked</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Open <strong>Settings → PayReport → Notifications</strong> on your device to allow them.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const iconClass = isSubscribed
    ? 'grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600'
    : 'grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600'

  const toggleClass = isSubscribed
    ? 'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-emerald-500 transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
    : 'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-300 transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

  const thumbClass = isSubscribed
    ? 'pointer-events-none inline-block h-6 w-6 translate-x-5 transform rounded-full bg-white shadow ring-0 transition duration-200'
    : 'pointer-events-none inline-block h-6 w-6 translate-x-0 transform rounded-full bg-white shadow ring-0 transition duration-200'

  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={iconClass}>
            <BellIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Push Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {isSubscribed ? 'Enabled on this device' : 'Get reminders and shift alerts'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={isSubscribed ? disable : enable}
          disabled={isPending}
          className={toggleClass}
          role="switch"
          aria-checked={isSubscribed}
          aria-label={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
        >
          <span className={thumbClass} />
        </button>
      </div>
      {error ? <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p> : null}
      {isPending ? (
        <p className="mt-3 text-xs text-slate-400">{isSubscribed ? 'Disabling...' : 'Enabling...'}</p>
      ) : null}
    </div>
  )
}
