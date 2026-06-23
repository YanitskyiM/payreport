import webPush from 'web-push'

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@payreport.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

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

/**
 * Sends a push notification to a single stored subscription.
 * Returns true on success, false if the subscription is stale (410/404).
 */
export async function sendPushNotification(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<{ success: boolean; stale: boolean }> {
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

