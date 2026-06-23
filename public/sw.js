// PayReport Service Worker — handles push notifications and notification clicks.
// iOS 16.4+ PWA (installed to Home Screen) supports Web Push via this SW.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'PayReport', body: event.data.text() }
  }

  const title = payload.title ?? 'PayReport'
  const options = {
    body: payload.body ?? '',
    icon: '/pwa/icon-192x192.png',
    badge: '/pwa/icon-64x64.png',
    tag: payload.tag ?? 'payreport-default',
    renotify: payload.renotify ?? false,
    data: {
      url: payload.url ?? '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing window if one matches the target URL
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise focus any existing window and navigate it
        for (const client of windowClients) {
          if ('focus' in client) {
            return client.focus().then((focused) => focused.navigate(targetUrl))
          }
        }
        // Last resort: open a new window
        return self.clients.openWindow(targetUrl)
      })
  )
})

