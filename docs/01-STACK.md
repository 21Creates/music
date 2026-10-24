# 01 — Stack

## Framework & Runtime

| Layer | Technology | Version | Evidence |
|---|---|---|---|
| UI Framework | React | 18.3.1 | `package.json:18` |
| Build Tool | Vite | 7.3.7 | `package.json:39` |
| Language | TypeScript | 5.5.3 (strict) | `package.json:25`, `tsconfig.app.json:14` (`"strict": true`) |
| Styling | Tailwind CSS | 3.4.1 | `package.json:35` |
| Icons | lucide-react | ^0.446.0 | `package.json:15` |
| Backend | Supabase | @supabase/supabase-js ^2.45.4 | `package.json:16` |
| State Mgmt | React Context | (no Redux/Zustand) | `src/context/*.tsx` — 4 providers |
| Router | Custom hash-based | (no React Router) | `src/hooks/useRoute.ts:8-33` |
| Testing | Vitest + Playwright | vitest ^2.1.6, @playwright/test ^1.48.0 | `package.json:24,27` |
| Linting | ESLint | ^9.13.0 | `package.json:19`, `eslint.config.js` |
| PWA | Service Worker + Manifest | Custom `public/sw.js`, `public/manifest.webmanifest` | `public/sw.js`, `public/manifest.webmanifest` |

## Build & Dev Scripts

From `package.json:5-9`:
- `dev`: `vite`
- `build`: `tsc -b && vite build`
- `preview`: `vite preview`
- `lint`: `eslint .`

## Vite Config

`vite.config.ts:6-18` — React plugin, path alias `@` → `src`, `optimizeDeps.exclude: ['@electric-sql/pglite']` (PGlite not actually used but configured).

## TypeScript Config

`tsconfig.app.json:14-22` — strict mode, noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch. JSX: `react-jsx`. Module: `ESNext`, target: `ES2020`.

## Deploy Target

**Cloudflare Pages** — inferred from `public/_headers` (security headers) and `public/_redirects` (SPA fallback to `index.html`).

## No External UI Theme Libraries

No shadcn/ui, no Material UI, no Chakra, no DaisyUI. All styling is hand-written Tailwind CSS with custom component classes in `src/index.css:46-200` (`@layer components`).
