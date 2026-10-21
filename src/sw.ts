/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Delete auth-bound cache left by previous SW versions — guardian data must not
// persist across sessions on shared devices.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.delete('supabase-rest'))
})

// Allow the app to explicitly clear guardian caches on logout / account switch.
self.addEventListener('message', (e) => {
  if ((e.data as { type?: string } | null)?.type === 'CLEAR_AUTH_CACHES') {
    e.waitUntil(caches.delete('supabase-rest'))
  }
})

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(data.title ?? 'واجبات الرميلة', {
    body: data.body, dir: 'rtl', lang: 'ar', icon: '/icon-192.png', data: { url: data.url ?? '/' }
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow(e.notification.data.url))
})
