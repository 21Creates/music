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
2. Queries `user_subscriptions` and `profiles` for the subscription details (`index.ts:50-54, 88-92`)
3. Calls `supabase.auth.admin.getUserById(userId)` to get the user's email (`index.ts:94`)
4. Fetches `payment_webhook_url` and `premium_currency` from `app_settings` (`index.ts:70-74`)
5. If a webhook URL exists, creates a signed URL for the receipt image via `createSignedUrl('vinyl-receipts', receipt_path, 3600)` (`index.ts:98-101`)
6. Computes an HMAC-SHA256 signature using `WEBHOOK_SECRET` (`index.ts:9-21, 121`)
7. POSTs the subscription + receipt data to the Apps Script webhook URL with `X-Vinyl-Signature` and `X-Vinyl-Timestamp` headers (`index.ts:125-133`)
8. Updates `webhook_status` on the subscription row (`index.ts:139-142`)
9. Returns success/failure

**Auth:** Requires a valid Supabase JWT (Authorization header) — `SubscribeModal.tsx:77` passes the session access token.

**CORS:** Standard CORS headers included (`index.ts:3-7`, `index.ts:24-26`).

**Signature verification:** The edge function signs the payload with HMAC-SHA256 using `WEBHOOK_SECRET`. The Apps Script template (`AdminPage.tsx:1591-1788`) does NOT verify the signature — it accepts all incoming POSTs. This is a security gap (see 10-KNOWN-BROKEN.md).

## 4. Payment Provider

**None.** There is no Stripe, PayPal, or any payment processor integration. Premium is a **manual payment + receipt upload** flow:

1. User sees payment instructions (bank details from `payment_details` table) in `SubscribeModal.tsx:177-192`
2. User makes a bank transfer externally
3. User enters a payment reference number and optionally uploads a receipt image
4. The subscription is created with `status: 'pending'`, `receipt_status: 'pending'` (`SubscribeModal.tsx:52-59`)
5. Admin reviews and approves/rejects via the admin dashboard

No Stripe dependency in `package.json`.

## 5. Email Service

**None** (beyond the Google Apps Script webhook which uses `MailApp.sendEmail` — that runs on Google's infrastructure, not in the app).

## 6. Analytics

**None.** No Google Analytics, no PostHog, no Mixpanel, no Segment. The admin dashboard has its own internal analytics via `admin_get_analytics` RPC which queries the database directly.

## 7. Push Provider

**None.** No push notifications. The app has a notifications system (the bell icon) that polls the `notifications` table. No web push, no FCM, no APNs.

## 8. PWA / Service Worker

**File:** `public/sw.js` (precache + offline cache)
**Registration:** `src/main.tsx:9`

The service worker handles precaching app assets and offline page serving. It does not integrate with any external push service.

## 9. Giphy API (chat GIFs)

The chat tab searches Giphy using the public beta API key `dc6zaTOxFJmzC`:
`src/pages/RoomPage.tsx:607`:
```typescript
const res = await fetch(`https://media.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=12`);
```

This uses Giphy's public beta key (not a registered API key). It's hardcoded, not in env vars.
