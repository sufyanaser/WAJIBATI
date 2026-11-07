import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

/** Official web host. Universal Links for this host are declared in App.entitlements. */
export const LINK_HOST = 'wajebati.app'

/** Guardian routes that a shared link may open inside the app. Anything else is ignored. */
export const ALLOWED_LINK_PATHS = ['/', '/archive', '/inquiries', '/timetable', '/login']

/**
 * Maps an incoming https://wajebati.app/... URL to an in-app route.
 * Returns null for other hosts, schemes, or paths outside the allowlist.
 *
 * Query and fragment are dropped on purpose: no link-based flow exists in this app
 * (no redirectTo, no magic-link or recovery callback), so nothing from them is needed,
 * and the router never sees their values.
 */
export function pathFromUniversalLink(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== LINK_HOST) return null
  const path = url.pathname.replace(/\/+$/, '') || '/'
  return ALLOWED_LINK_PATHS.includes(path) ? path : null
}

/**
 * Suppresses the same URL arriving twice in a short window. On cold start the same link
 * can come from getLaunchUrl() and from an appUrlOpen event.
 */
export function createLinkDeduper(windowMs = 1500, now: () => number = Date.now) {
  let last: { url: string; at: number } | null = null
  return (url: string): boolean => {
    const t = now()
    if (last && last.url === url && t - last.at < windowMs) return false
    last = { url, at: t }
    return true
  }
}

/**
 * Subscribes to Universal Link opens on native platforms and handles the cold-start URL once.
 * Returns an unsubscribe function. No-op on web.
 */
export function listenForUniversalLinks(onPath: (path: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}
  const isNew = createLinkDeduper()
  const handle = (raw: string | undefined) => {
    if (!raw || !isNew(raw)) return
    const path = pathFromUniversalLink(raw)
    if (path) onPath(path)
  }

  let cancelled = false
  void CapApp.getLaunchUrl().then(result => {
    if (!cancelled) handle(result?.url)
  })
  const listener = CapApp.addListener('appUrlOpen', ({ url }) => handle(url))

  return () => {
    cancelled = true
    void listener.then(h => h.remove())
  }
}
