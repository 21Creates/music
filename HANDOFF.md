# HANDOFF.md
**Read AGENTS.md first.**

## Where we are (2026-10-24)
Phase 0 (governance files) batch 1 of 2 written. A first-draft app exists but has **never been built or run** (no network where it was written). Nothing has been deployed. Nothing has been tested against a real Supabase project.

## What's finished (written, UNVERIFIED)
- Database: `supabase/migrations/0001_foundation.sql` (tables, row-level security, server functions, storage rules, seeded settings) with rollback `0001_foundation.down.sql`; `0002_app_rpcs.sql` (admin functions); `0003_room_tracks.sql`; `supabase/verify_phase1.sql` (exploit attempts).
- App (`src/`): email-code login, catalog + search, player (seek, volume, shuffle, repeat, media session), offline saving as cached blobs, premium checkout with proof upload, rooms (code join, discovery join, approvals, add tracks), admin (approve/reject, upload tracks, settings editor, webhook ping + Apps Script template), install banner.
- Webhook: `supabase/functions/notify-webhook/index.ts` (signed, body-envelope HMAC).
- PWA files in `public/`: manifest, icons, shell-only `sw.js`, `offline.html`.
- Deploy files: `netlify.toml`, `.nvmrc`, `.env.example`, `DEPLOY.md`, `DECISIONS.md`, `LAUNCH.md`.

## What's half-done
- Tailwind is required by the stack but not installed; the draft uses `src/styles.css`.
- `docs/` and governance files: this batch writes README, AGENTS, HANDOFF, DECISIONS, docs/VINYL-SPEC.md.

## What's next
1. Phase 0 batch 2: swap `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.gitignore`, `src/index.css` for Tailwind-ready versions.
2. Phase 2: deploy to Netlify and confirm the page loads (first real test of `npm run build`).
3. Phases 3–4: connect Supabase, run migrations, run `verify_phase1.sql`, fix whatever fails.
4. Then verify phases 5–10 one by one on the live URL.
Not built at all: push notifications, queue drawer, artwork, admin two-step login, ads, premium feature-list editor, approval emails, update-available prompt, splash screens, invite-code rate limiting.

## Rules (verbatim, never remove)
1. Tool-agnostic. No vendor-specific anything. Any AI must be able to continue from the repo.
2. Boring stack. React + Vite + TypeScript + Tailwind + Supabase. No exotic dependencies.
3. The repo tells the story. If knowledge isn't in a file, it doesn't exist. Chat context is disposable.
4. Progress is committed to GitHub at every checkpoint. HANDOFF.md is updated every phase and batch.
5. Complete files only. Never "add this line somewhere."
6. No placeholders, no TODOs, no stubs. Unbuilt = not in code, listed in HANDOFF.md.
7. The AI cannot write to GitHub. It produces file contents; the owner pastes them. Never claim a commit happened.
8. One commit message per batch, typed exactly.

## Environment
- Client vars (Netlify → Site settings → Environment variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Server secret (Supabase Edge Function secret): `WEBHOOK_SECRET`.
- Node 20. Live URL: not deployed yet.
