/**
 * Registers the PayReport service worker.
 * Returns the ServiceWorkerRegistration, or null if unsupported.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (error) {
    console.error('[PayReport SW] Registration failed:', error)
    return null
  }
}

/**
 * Returns the active ServiceWorkerRegistration, waiting for it to be ready.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

