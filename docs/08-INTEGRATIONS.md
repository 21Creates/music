# 08 — Integrations

## 1. Supabase
- **URL:** `https://<project-ref>.supabase.co` (`.env:1`)
- **Client:** `src/lib/supabase.ts:6-11` — `createClient` with `persistSession: true`, `autoRefreshToken: true`
- **Auth:** Email/password, no confirmation, no social
- **Used for:** Auth, database (RLS-scoped), storage (bucket policies), realtime subscriptions

## 2. Google Apps Script Webhook (payment notifications)
Full Apps Script template embedded in `AdminPage.tsx:1591-1788` (`APPS_SCRIPT_TEMPLATE` constant). It's a `doPost` handler that:
1. Parses JSON from edge function
2. Deduplicates by reference using `CacheService`
3. Sends HTML email via `MailApp.sendEmail`
4. Returns JSON status

Key constants: `NOTIFY_EMAIL = "you@yourdomain.com"` (placeholder), `BRAND_NAME = "Vinyl"`

**Flow:**
1. Admin saves deployed `/exec` URL via Webhook tab → stored in `app_settings.payment_webhook_url`
2. User uploads receipt → `SubscribeModal.tsx:71-80` POSTs to edge function
3. Edge function fetches URL from `public_get_webhook_url()`, POSTs subscription data to Apps Script

**Admin test ping:** `AdminPage.tsx:1835-1853` — sends `{ type: 'ping' }` directly via `fetch()`

## 3. Edge Function: `send-subscription-webhook`
**File:** `supabase/functions/send-subscription-webhook/index.ts`

Receives `{ subscriptionId, userId }`, queries `user_subscriptions` + `profiles` + `auth.users`, creates signed URL for receipt, computes HMAC-SHA256 signature with `WEBHOOK_SECRET`, POSTs to Apps Script webhook URL with `X-Vinyl-Signature` and `X-Vinyl-Timestamp` headers, updates `webhook_status`.

CORS headers included (`index.ts:3-7`). Requires valid Supabase JWT.

**Security gap:** The Apps Script template does NOT verify the signature — accepts all POSTs.

## 4. Payment Provider
**None.** No Stripe, no PayPal. Manual payment + receipt upload:
1. User sees bank details in `SubscribeModal.tsx:177-192`
2. User makes external bank transfer
3. User enters payment reference + uploads receipt image
4. Subscription created with `status: 'pending'`, `receipt_status: 'pending'`
5. Admin reviews and approves/rejects via dashboard

## 5. Email Service
**None** (beyond Apps Script's `MailApp.sendEmail` running on Google's infrastructure).

## 6. Analytics
**None.** No GA, PostHog, Mixpanel. Admin dashboard has internal analytics via `admin_get_analytics` RPC.

## 7. Push Notifications
**None.** Notifications system polls `notifications` table. No web push, FCM, or APNs.

## 8. PWA / Service Worker
**File:** `public/sw.js` (precache + offline cache)
**Registration:** `src/main.tsx:9`

## 9. Giphy API (chat GIFs)
`RoomPage.tsx:607` uses Giphy public beta key `dc6zaTOxFJmzC` (hardcoded, not in env):
```
https://media.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=...
```
