import webPush from 'web-push'

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

export type StoredSubscription = {
  endpoint: string
  keys_p256dh: string
  keys_auth: string
}

// Lazily initialised so missing env vars at import time don't crash the module
let vapidInitialised = false
function ensureVapid() {
  if (vapidInitialised) return
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@payreport.app'
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
  }
  webPush.setVapidDetails(subject, publicKey, privateKey)
  vapidInitialised = true
}

/**
 * Sends a push notification to a single stored subscription.
 * Returns { success, stale } — stale means the subscription is expired (410/404).
 */
export async function sendPushNotification(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<{ success: boolean; stale: boolean }> {
  ensureVapid()

  const pushSubscription: webPush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys_p256dh,
      auth: subscription.keys_auth,
    },
  }

  try {
    await webPush.sendNotification(pushSubscription, JSON.stringify(payload))
    return { success: true, stale: false }
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    const stale = statusCode === 410 || statusCode === 404
    if (!stale) {
      console.error('[PayReport Push] Send failed:', error)
    }
    return { success: false, stale }
  }
}
