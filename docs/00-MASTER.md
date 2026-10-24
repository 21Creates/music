# 00 — Master Index

## Vinyl — Evidence-Based Rebuild Specification

Complete specification for rebuilding the Vinyl music platform. Every claim backed by `file:line` evidence.

## Document Index

| # | Document | Covers |
|---|---|---|
| 01 | STACK.md | Framework, build tool, language, router, state, styling, testing, deploy target |
| 02 | ENV.md | Environment variables (client + edge function), no third-party API keys |
| 03 | DATABASE.md | 28+ tables, 60+ RPCs, 5 storage buckets, 40 migrations, schema drift |
| 04 | AUTH.md | Auth provider, session persistence, dual admin auth, route guards |
| 05 | STORAGE.md | 5 buckets, public/private, getPublicUrl/createSignedUrl calls, policies |
| 06 | ROUTES.md | Hash-based router, route table, layout structure |
| 07 | CLICKABLES.md | All 413 interactive elements with file:line and action |
| 08 | INTEGRATIONS.md | Supabase, Google Apps Script webhook, edge function, Giphy, PWA |
| 09 | DESIGN.md | Color palette, fonts, component styles, animations |
| 10 | KNOWN-BROKEN.md | 15 documented issues: orphaned tables, non-functional toggles, security gaps |

## Quick Facts

- **Framework:** React 18.3.1 + Vite 7.3.7 + TypeScript 5.5.3 (strict)
- **Backend:** Supabase (database, auth, storage, realtime, edge functions)
- **Styling:** Tailwind CSS 3.4.1 with custom ink/electric/magenta color ramps
- **Router:** Custom hash-based (`src/hooks/useRoute.ts`)
- **State:** React Context (4 providers: Auth, Premium, Toast, Notifications)
- **Admin:** Password-only auth (no login required), 12-tab dashboard
- **Premium:** Manual payment + receipt upload + admin approval (no Stripe)
- **PWA:** Service worker + manifest, installable, offline track caching
- **Deploy:** Cloudflare Pages (inferred from `_headers`/`_redirects`)
