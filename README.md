# Vinyl

Vinyl is an unreleased-music community and player (tagline: *unreleased. first.*). Listeners discover and play tracks, save some for offline listening, pay for Premium by bank transfer, and join rooms. An admin runs everything from an admin panel.

**Stack:** React + Vite + TypeScript + Tailwind + Supabase (database, login, file storage). Hosted on Netlify from this GitHub repo.

**Before anything else:** read `AGENTS.md` and `HANDOFF.md`. The product rules are in `docs/VINYL-SPEC.md`.

## Deploy (Netlify via GitHub)
1. Put this repo on GitHub.
2. netlify.com → Add new site → Import an existing project → GitHub → pick this repo.
3. Netlify reads `netlify.toml` (build `npm run build`, publish `dist`). Click Deploy.
4. Site settings → Environment variables → add the values listed in `.env.example`. Redeploy.
5. Every later commit to `main` redeploys automatically.

## Database setup
In Supabase → SQL Editor, run the files in `supabase/migrations/` in number order (`0001`, `0002`, `0003`), then `supabase/verify_phase1.sql`. Full steps: `DEPLOY.md`.
