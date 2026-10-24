# 00 — Master Index

## Vinyl — Evidence-Based Rebuild Specification

This is a complete specification for rebuilding the Vinyl music platform from scratch. Every claim is backed by `file:line` evidence from the actual repository.

## Document Index

| # | Document | What it covers |
|---|---|---|
| 01 | [STACK.md](01-STACK.md) | Framework, build tool, language, router, state management, styling, testing, linting, deploy target |
| 02 | [ENV.md](02-ENV.md) | Environment variables (client + edge function), no third-party API keys |
| 03 | [DATABASE.md](03-DATABASE.md) | All 28+ tables with columns/types/defaults, RLS summary, 60+ RPC functions, 5 storage buckets, 40 migrations, schema drift |
| 04 | [AUTH.md](04-AUTH.md) | Auth provider, session persistence, sign in/up/out, auto-profile creation, dual admin auth (profile flag vs password gate), route guards |
| 05 | [STORAGE.md](05-STORAGE.md) | 5 storage buckets, public vs private, getPublicUrl/createSignedUrl calls, upload/delete surfaces, storage policies |
| 06 | [ROUTES.md](06-ROUTES.md) | Hash-based router, route table, layout structure, route parsing, no premium/admin route guards |
| 07 | [CLICKABLES.md](07-CLICKABLES.md) | Complete inventory of every button, input, select, textarea, and clickable element with file:line and action |
| 08 | [INTEGRATIONS.md](08-INTEGRATIONS.md) | Supabase, Google Apps Script webhook, edge function, payment flow (manual), Giphy API, PWA service worker |
| 09 | [DESIGN.md](09-DESIGN.md) | Color palette, fonts, logo/icons, spacing, component styles, theme (dark only), animations, safe area, reduced motion |
| 10 | [KNOWN-BROKEN.md](10-KNOWN-BROKEN.md) | 15 known issues: admin login error, orphaned tables, non-functional toggles, security gaps, weak password policy |

## Quick Facts

- **Framework:** React 18.3.1 + Vite 7.3.7 + TypeScript 5.5.3 (strict)
- **Backend:** Supabase (database, auth, storage, realtime, edge functions)
- **Styling:** Tailwind CSS 3.4.1 with custom ink/electric/magenta color ramps
- **Router:** Custom hash-based (`src/hooks/useRoute.ts`) — no React Router
- **State:** React Context (4 providers: Auth, Premium, Toast, Notifications)
- **Admin:** Password-only auth (no login required), 12-tab dashboard
- **Premium:** Manual payment + receipt upload + admin approval (no Stripe)
- **PWA:** Service worker + manifest, installable, offline track caching
- **Deploy:** Cloudflare Pages (inferred from `_headers`/`_redirects`)
- **Tables:** 28+ across 40 migrations
- **RPCs:** 60+ (admin + user-facing)
- **Interactive elements:** 413 total across all pages/components

## How to Use This Specification

1. Start with **01-STACK.md** to set up the project skeleton
2. Follow **03-DATABASE.md** to create all tables, RLS policies, and RPC functions
3. Use **04-AUTH.md** for the dual auth model (user login + admin password gate)
4. Use **06-ROUTES.md** + **07-CLICKABLES.md** together to build each page
5. Reference **09-DESIGN.md** for all visual styling
6. Check **10-KNOWN-BROKEN.md** to avoid reproducing existing bugs
7. Use **08-INTEGRATIONS.md** for Supabase, webhook, and edge function setup
