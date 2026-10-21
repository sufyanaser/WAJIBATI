/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

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
