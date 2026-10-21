// POST { section_id, title, body, url }  — admin JWT required
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VITE_VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: ok } = await user.rpc('is_admin')
  if (!ok) return new Response('forbidden', { status: 403 })

  const { section_id, title, body, url } = await req.json()
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: subs } = await db.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth,guardians!inner(guardian_students!inner(students!inner(section_id)))')
    .eq('guardians.guardian_students.students.section_id', section_id)

  let sent = 0, dead: string[] = []
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url }))
      sent++
    } catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id) }
  }))
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead)
  return Response.json({ sent, removed: dead.length })
})
