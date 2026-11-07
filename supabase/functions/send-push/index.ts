// POST { section_id, title, body, url }  — admin JWT required
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VITE_VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: ok } = await user.rpc('is_admin')
  if (!ok) return new Response('forbidden', { status: 403, headers: CORS })

  const { section_id, title, body, url } = await req.json()
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Use SQL RPC to reliably fetch subscriptions for a section
  const { data: subs } = await db.rpc('get_section_subscriptions', { p_section_id: section_id })

  let sent = 0, dead: string[] = []
  await Promise.all((subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url }))
      sent++
    } catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id) }
  }))
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead)
  return Response.json({ sent, removed: dead.length }, { headers: CORS })
})
