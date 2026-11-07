import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── VAPID key helper ──────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

// ── types ─────────────────────────────────────────────────────────────────────
type PermissionState = 'default' | 'granted' | 'denied'

interface UsePushSubscriptionResult {
  supported: boolean
  permission: PermissionState
  subscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  loading: boolean
}

// ── hook ──────────────────────────────────────────────────────────────────────
export function usePushSubscription(sectionId: string): UsePushSubscriptionResult {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  const [permission, setPermission] = useState<PermissionState>(
    supported ? (Notification.permission as PermissionState) : 'default'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check initial subscription state
  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {/* ignore */})
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)
      if (perm !== 'granted') return

      // 2. Get SW registration
      const reg = await navigator.serviceWorker.ready

      // 3. Subscribe via pushManager
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // 4. Extract keys
      const json = sub.toJSON()
      const endpoint = sub.endpoint
      const p256dh = json.keys?.p256dh ?? ''
      const auth = json.keys?.auth ?? ''

      // 5. Get guardian_id via RPC then upsert
      const { data: guardianId, error: rpcErr } = await supabase.rpc('my_guardian_id')
      if (rpcErr || !guardianId) throw new Error('no guardian')

      const { error: upsertErr } = await supabase
        .from('push_subscriptions')
        .upsert(
          { guardian_id: guardianId, section_id: sectionId, endpoint, p256dh, auth },
          { onConflict: 'endpoint' }
        )
      if (upsertErr) throw upsertErr

      setSubscribed(true)
    } catch (err) {
      // permission denied or other error — don't throw, just log
      console.warn('push subscribe failed', err)
    } finally {
      setLoading(false)
    }
  }, [supported, sectionId])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
      }
      setSubscribed(false)
    } catch (err) {
      console.warn('push unsubscribe failed', err)
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { supported, permission, subscribed, subscribe, unsubscribe, loading }
}
