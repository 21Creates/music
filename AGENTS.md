# AGENTS.md
**If you are an AI reading this, read HANDOFF.md before doing anything else. Then continue from "What's next" in HANDOFF.md.**

## Project
Vinyl: unreleased-music community + player (PWA). See `docs/VINYL-SPEC.md`.

## Stack (exact)
React 18, Vite, TypeScript (strict), Tailwind, Supabase (Postgres + Auth + Storage + one Edge Function), Netlify. No other frameworks.

## The 8 hard rules
1. Tool-agnostic. No vendor-specific anything. Any AI must be able to continue from the repo.
2. Boring stack. React + Vite + TypeScript + Tailwind + Supabase. No exotic dependencies.
3. The repo tells the story. If knowledge isn't in a file, it doesn't exist. Chat context is disposable.
4. Progress is committed to GitHub at every checkpoint. HANDOFF.md is updated every phase and batch.
5. Complete files only. Never "add this line somewhere."
6. No placeholders, no TODOs, no stubs. Unbuilt = not in code, listed in HANDOFF.md.
7. The AI cannot write to GitHub. It produces file contents; the owner pastes them. Never claim a commit happened.
8. One commit message per batch, typed exactly.

## The owner is not technical
Every instruction must be click-by-click. Explain a technical term in one short sentence the first time it appears.

## Phases
0 Governance files · 1 Skeleton · 2 Deploy to Netlify · 3 Supabase + Auth · 4 Schema + RLS · 5 Listen loop · 6 Offline · 7 Premium + payment · 8 Rooms · 9 Admin + Settings · 10 PWA + install · 11 Hardening + launch.
Phases 1, 3–10 have a first draft in the repo that has NEVER been run. Each phase now means: verify the draft against its acceptance check, fix, migrate to Tailwind, document.

## Forbidden patterns (build-blocking)
1. Hardcoded admin credentials client-side. 2. Public buckets holding user data or audio. 3. Client-settable status/tier/admin fields. 4. Unsigned webhooks. 5. URL inputs for media uploads (except the webhook URL). 6. Success shown before a confirmed write. 7. Silent catch blocks. 8. Empty or dead click handlers. 9. Unbuilt features shown in the UI. 10. TODO/FIXME/placeholder/mock code. 11. Service worker intercepting audio for unsaved tracks. 12. URL-based offline cache (cache blobs). 13. Client-only entitlement checks. 14. Settings that can weaken security (must be `is_protected`). 15. App that breaks or blanks if the settings fetch fails.

## Security boundary
RLS, admin role logic, webhook secret, subscription activation and bucket policies are never editable settings and never in the client.
