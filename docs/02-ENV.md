# 02 — Environment Variables

Every environment variable referenced in `src/` code, with evidence.

## Grep Methodology

Ran `grep -rn "process.env|import.meta.env" src/` — found 3 references across 2 files.

## Variable Table

| Variable name | Where referenced (file:line) | Purpose | Required or optional | Exposed to client? |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts:3` | Supabase project URL — used to initialize the Supabase client (`createClient(supabaseUrl, ...)`) | Required | Yes — `VITE_` prefix exposes to client |
| `VITE_SUPABASE_URL` | `src/components/SubscribeModal.tsx:71` | Constructs the edge function URL: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-webhook` | Required | Yes — `VITE_` prefix exposes to client |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:4` | Supabase anon public key — passed as second arg to `createClient()` for RLS-scoped access | Required | Yes — `VITE_` prefix exposes to client |

## .env File Contents (variable names only, values redacted)

Evidence — `.env` contains exactly 2 variables:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-jwt>
```

## Server-Only Variables

NOT FOUND — searched for `process.env` in `src/`, no results. The only edge function (`supabase/functions/send-subscription-webhook/index.ts`) uses Deno environment variables (not `import.meta.env`), but that code is not part of the Vite client bundle.

## Variables Referenced but NOT Defined

NOT FOUND — all `import.meta.env` references in `src/` use variables that exist in `.env`.

## Notes

- No `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env` — the service role key is NOT exposed to the client. This is correct for security.
- No `VITE_STRIPE_*`, `VITE_GOOGLE_*`, or any third-party API keys in `.env` or `src/`.
- The Supabase client is configured with `persistSession: true` and `autoRefreshToken: true` (`src/lib/supabase.ts:8-9`), meaning the Supabase auth token is stored in browser localStorage and automatically refreshed.
