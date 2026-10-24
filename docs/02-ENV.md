# 02 — Environment

## Client-Side Environment Variables

The app exposes two `VITE_`-prefixed env vars to the browser bundle:

| Variable | Purpose | Required? | Evidence |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `.env:1` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (JWT) | Yes | `.env:2` |

These are read in `src/lib/supabase.ts:3-4`:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## No Server-Side Secrets in Client

The `VITE_` prefix means these values are embedded in the client bundle and visible to anyone. This is by design — the anon key is safe to expose because RLS policies enforce access control at the database level.

## Edge Function Environment Variables

The edge function `supabase/functions/send-subscription-webhook/index.ts` uses:
- `SUPABASE_URL` (Deno.env, line 46) — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` (Deno.env, line 47) — auto-provided by Supabase
- `WEBHOOK_SECRET` (Deno.env, line 37) — must be configured as an edge function secret

`WEBHOOK_SECRET` is NOT in `.env` — it is an edge function secret, not a client env var.

## No Third-Party API Keys

No Stripe key, no Google Maps key, no Firebase config, no Sentry DSN, no analytics keys. The only external integration is the Google Apps Script webhook URL, which is stored in the database (`app_settings.payment_webhook_url`), not in env.
