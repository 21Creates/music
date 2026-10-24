# 08 — Integrations

## 1. Supabase

**URL pattern:** `https://<project-ref>.supabase.co`

Evidence — `.env:1`: `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`

Client init — `src/lib/supabase.ts:6-11`:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

**Authentication:** Supabase anon key (JWT, exposed to client). Used for Auth (email/password), database (RLS-scoped queries), storage (bucket policies), realtime (subscriptions).

**Called from:** Every file that imports `@/lib/supabase`. The `supabase` singleton is used across all contexts, pages, and components.

## 2. Google Apps Script Webhook (payment notifications)

**Full script** is embedded as a template string in `src/pages/AdminPage.tsx:1591-1788` (the `APPS_SCRIPT_TEMPLATE` constant).

The script is a Google Apps Script `doPost` handler that:
1. Parses incoming JSON from the edge function
2. Deduplicates by reference using `CacheService`
3. Sends an HTML email notification via `MailApp.sendEmail`
4. Returns JSON status

Key constants in the script:
- `NOTIFY_EMAIL = "you@yourdomain.com"` — placeholder, admin must change
- `BRAND_NAME = "Vinyl"`
- Color scheme: Black `#0D0C0B`, Cream `#F3ECDD`, Acid `#DFFF3F`

**How the app calls it:**
1. The admin saves the deployed `/exec` URL via the Webhook tab (`AdminPage.tsx:1813-1832`) → `admin_save_settings` RPC stores it in `app_settings.payment_webhook_url`
2. When a user uploads a receipt, `SubscribeModal.tsx:71-80` POSTs to the Supabase edge function `send-subscription-webhook`
3. The edge function fetches `public_get_webhook_url()` from the database, then POSTs the subscription data to the Apps Script URL

**Admin test ping:** `AdminPage.tsx:1835-1853` — sends `{ type: 'ping' }` directly to the webhook URL via `fetch()`. The Apps Script responds with `{ status: 'ok' }`.

## 3. Supabase Edge Function: `send-subscription-webhook`

**File:** `supabase/functions/send-subscription-webhook/index.ts`

**Config:** `supabase/config.toml` must have a `[functions.send-subscription-webhook]` table with `verify_jwt = true`.

**What it does:**
1. Receives POST with `{ subscriptionId, userId }` from `SubscribeModal.tsx`
2. Queries `user_subscriptions` and `profiles` for the subscription details
3. Calls `public_get_webhook_url()` RPC to get the Apps Script URL
4. If a webhook URL exists, fetches the receipt image via `getPublicUrl('vinyl-receipts', receipt_path)`
5. POSTs the subscription + receipt data to the Apps Script webhook URL
6. Returns success/failure

**Auth:** Requires a valid Supabase JWT (Authorization header) — `SubscribeModal.tsx:77` passes the session access token.

**CORS:** Must include the standard CORS headers (per Bolt Supabase guidelines).

## 4. Payment Provider

**None.** There is no Stripe, PayPal, or any payment processor integration. Premium is a **manual payment + receipt upload** flow:

1. User sees payment instructions (bank details from `payment_details` table) in `SubscribeModal.tsx:177-192`
2. User makes a bank transfer externally
3. User enters a payment reference number and optionally uploads a receipt image
4. The subscription is created with `status: 'pending'`, `receipt_status: 'pending'` (`SubscribeModal.tsx:52-59`)
5. Admin reviews and approves/rejects via the admin dashboard

No `bolt-stripe` skill was invoked. No Stripe dependency in `package.json`.

## 5. Email Service

**None** (beyond the Google Apps Script webhook which uses `MailApp.sendEmail` — that runs on Google's infrastructure, not in the app).

## 6. Analytics

**None.** No Google Analytics, no PostHog, no Mixpanel, no Segment. The admin dashboard has its own internal analytics via `admin_get_analytics` RPC which queries the database directly.

## 7. Push Provider

**None.** No push notifications. The app has a notifications system (the bell icon) that polls the `notifications` table via Supabase realtime or interval queries. No web push, no FCM, no APNs.

## 8. PWA / Service Worker

**File:** `public/sw.js` (precache + offline cache)
**Registration:** `src/main.tsx:9`

The service worker handles precaching app assets and offline page serving. It does not integrate with any external push service. It responds to `SKIP_WAITING` and `PRECACHE_ASSETS` messages from the client.
