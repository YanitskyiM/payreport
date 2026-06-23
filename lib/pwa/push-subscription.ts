import { urlBase64ToUint8Array } from './vapid'
import { getServiceWorkerRegistration } from './register-sw'

export type PushSubscriptionStatus = 'unsupported' | 'denied' | 'default' | 'granted'

/**
 * Returns true only when running as an installed PWA (standalone mode).
 * On iOS, push notifications only work when installed to Home Screen.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS sets this property
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Returns the current Notification permission status.
 */
export function getNotificationPermission(): PushSubscriptionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as PushSubscriptionStatus
}

/**
 * Requests notification permission from the user.
 * MUST be called from a user gesture (button click).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

/**
 * Subscribes the current device to Web Push using VAPID.
 * Returns the serialised PushSubscription or null on failure.
 */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.error('[PayReport Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.')
    return null
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Required on iOS
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    return subscription.toJSON()
  } catch (error) {
    console.error('[PayReport Push] Subscribe failed:', error)
    return null
  }
}

/**
 * Returns the current push subscription, or null if not subscribed.
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

/**
 * Unsubscribes from push notifications on this device.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return true
  return subscription.unsubscribe()
}

