import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json({ status: 'unauthenticated' }, 401)
  let aal = 'aal1'; try { aal = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal } catch { /* keep aal1 */ }
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: p } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin' || aal !== 'aal2') return json({ status: 'forbidden' }, 403)
  const { sub_id, decision } = await req.json().catch(() => ({}))
  const { data: s } = await db.from('subscriptions').select('user_id,status').eq('id', sub_id).single()
  if (!s || s.status !== (decision === 'approved' ? 'active' : 'rejected')) return json({ status: 'subscription state does not match decision' }, 409)
  const title = decision === 'approved' ? 'Premium is active' : 'Payment proof rejected'
  const body = decision === 'approved' ? 'Your payment was approved. Enjoy Vinyl Premium.' : 'Your payment proof was rejected. Open Vinyl to submit it again.'
  // email (Resend)
  let email = 'not configured'
  const key = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('RESEND_FROM')
  if (key && from) {
    const { data: u } = await db.auth.admin.getUserById(s.user_id); const to = u.user?.email
    if (to) { const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject: title, text: body }) }); email = r.ok ? 'sent' : `failed:${r.status}` }
    else email = 'no email on account'
  }
  // push (Web Push)
  let push = 'not configured'
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'); const priv = Deno.env.get('VAPID_PRIVATE_KEY'); const subj = Deno.env.get('VAPID_SUBJECT')
  if (pub && priv && subj) {
    webpush.setVapidDetails(subj, pub, priv)
    const { data: subs } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', s.user_id)
    let ok = 0, fail = 0
    for (const x of subs ?? []) {
      try { await webpush.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, JSON.stringify({ title, body, url: '/' })); ok++ }
      catch (e) { fail++; const sc = (e as { statusCode?: number }).statusCode; if (sc === 404 || sc === 410) await db.from('push_subscriptions').delete().eq('id', x.id) }
    }
    push = `sent ${ok}, failed ${fail}`
  }
  return json({ email, push })
})
