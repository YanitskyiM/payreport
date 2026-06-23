'use client'

import { useCallback, useEffect, useState } from 'react'
import { getServiceWorkerRegistration } from '@/lib/pwa/register-sw'
import {
  getCurrentPushSubscription,
  getNotificationPermission,
  isStandalonePWA,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSubscriptionStatus,
} from '@/lib/pwa/push-subscription'

type UsePushNotificationsReturn = {
  /** Whether this browser supports push notifications */
  isSupported: boolean
  /** Whether the app is running as an installed PWA (standalone mode) */
  isStandalone: boolean
  /** Current notification permission status */
  permission: PushSubscriptionStatus
  /** Whether the user is currently subscribed on this device */
  isSubscribed: boolean
  /** Whether an async operation is in progress */
  isPending: boolean
  /** Error message from the last operation */
  error: string | null
  /** Re-read browser permission and current push subscription */
  refresh: () => Promise<void>
  /** Enable push notifications — triggers the permission prompt then subscribes */
  enable: () => Promise<void>
  /** Disable push notifications for this device */
  disable: () => Promise<boolean>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [permission, setPermission] = useState<PushSubscriptionStatus>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setIsSupported(supported)
    const standalone = isStandalonePWA()
    setIsStandalone(standalone)

    if (!supported) {
      setPermission('unsupported')
      setIsSubscribed(false)
      return
    }

    const nextPermission = getNotificationPermission()
    setPermission(nextPermission)

    if (nextPermission !== 'granted') {
      setIsSubscribed(false)
      return
    }

    const reg = await getServiceWorkerRegistration()
    if (!reg) {
      setIsSubscribed(false)
      return
    }

    const sub = await reg.pushManager.getSubscription()
    setIsSubscribed(Boolean(sub))
  }, [])

  useEffect(() => {
    void refresh()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  const disableReminderSettings = useCallback(async () => {
    const response = await fetch('/api/push/reminders/disable', { method: 'POST' })
    if (!response.ok) {
      throw new Error('Failed to disable reminder settings')
    }
  }, [])

  const enable = useCallback(async () => {
    setError(null)
    setIsPending(true)
    try {
      const perm = await requestNotificationPermission()
      setPermission(perm as PushSubscriptionStatus)

      if (perm !== 'granted') {
        setError(
          perm === 'denied'
            ? 'Notifications were blocked. Please allow them in your device settings.'
            : 'Permission not granted.'
        )
        return
      }

      const subscriptionJson = await subscribeToPush()
      if (!subscriptionJson) {
        setError('Failed to create push subscription. Please try again.')
        return
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionJson),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.error ?? 'Failed to save subscription. Please try again.')
        return
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('[usePushNotifications] enable error:', err)
      setError('An unexpected error occurred.')
    } finally {
      setIsPending(false)
    }
  }, [])

  const disable = useCallback(async (): Promise<boolean> => {
    setError(null)
    setIsPending(true)
    try {
      const currentSub = await getCurrentPushSubscription()
      const endpoint = currentSub?.endpoint

      await unsubscribeFromPush()

      if (endpoint) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }

      await disableReminderSettings()
      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('[usePushNotifications] disable error:', err)
      setError('Failed to fully disable notifications. Please try again.')
      return false
    } finally {
      setIsPending(false)
    }
  }, [disableReminderSettings])

  return {
    isSupported,
    isStandalone,
    permission,
    isSubscribed,
    isPending,
    error,
    refresh,
    enable,
    disable,
  }
}
