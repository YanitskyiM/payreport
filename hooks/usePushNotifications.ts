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
  /** Enable push notifications — triggers the permission prompt then subscribes */
  enable: () => Promise<void>
  /** Disable push notifications for this device */
  disable: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [permission, setPermission] = useState<PushSubscriptionStatus>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setIsSupported(supported)
    setIsStandalone(isStandalonePWA())

    if (supported) {
      setPermission(getNotificationPermission())

      // Check if already subscribed on this device
      getServiceWorkerRegistration().then((reg) => {
        if (!reg) return
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(Boolean(sub))
        })
      })
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

  const disable = useCallback(async () => {
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

      setIsSubscribed(false)
    } catch (err) {
      console.error('[usePushNotifications] disable error:', err)
      setError('Failed to disable notifications. Please try again.')
    } finally {
      setIsPending(false)
    }
  }, [])

  return {
    isSupported,
    isStandalone,
    permission,
    isSubscribed,
    isPending,
    error,
    enable,
    disable,
  }
}

