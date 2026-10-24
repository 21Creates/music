# 02 — Environment

## Client-Side Env Vars

| Variable | Purpose | Required | Evidence |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `.env:1` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes | `.env:2` |

Read in `src/lib/supabase.ts:3-4` via `import.meta.env.VITE_*`.

## Edge Function Env Vars

The edge function `supabase/functions/send-subscription-webhook/index.ts` uses:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)
- `WEBHOOK_SECRET` (must be configured as edge function secret, line 37)

## No Third-Party API Keys in Env
No Stripe, no Google Maps, no Firebase, no Sentry. The Google Apps Script webhook URL is stored in the database (`app_settings.payment_webhook_url`), not in env. Giphy uses a hardcoded public beta key (see 08-INTEGRATIONS.md).
