/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Cache Supabase REST calls with NetworkFirst so last-viewed day is available offline
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
  new NetworkFirst({ cacheName: 'supabase-rest', networkTimeoutSeconds: 5 })
)

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
