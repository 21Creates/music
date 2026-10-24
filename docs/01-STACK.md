# 01 — Stack

Evidence-based documentation of the framework, build tooling, and dependencies.

## Framework + Version

**React 18.3.1** with React DOM 18.3.1.

Evidence — `package.json:16-17`:
```json
"react": "^18.3.1",
"react-dom": "^18.3.1",
```

Entry point: `src/main.tsx:71-75` — `createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`.

## Build Tool + Version

**Vite 7.3.7** with `@vitejs/plugin-react` 5.1.1.

Evidence — `package.json:33-34`:
```json
"vite": "^7.3.7",
```
```json
"@vitejs/plugin-react": "^5.1.1",
```

Config: `vite.config.ts` — uses `react()` plugin, path alias `@` → `./src` (`vite.config.ts:9-11`), `optimizeDeps.exclude: ['lucide-react']` (`vite.config.ts:13-15`).

Build script: `package.json:8` — `"build": "vite build"`.

## Language

**TypeScript 5.5.3**, strict mode enabled.

Evidence — `package.json:32`:
```json
"typescript": "^5.5.3",
```

Strict config — `tsconfig.app.json:24`:
```json
"strict": true,
```

Additional TS settings (`tsconfig.app.json:25-27`):
- `noUnusedLocals: false`
- `noUnusedParameters: false`
- `noFallthroughCasesInSwitch: true`

Target: ES2020 (`tsconfig.app.json:3`). Module: ESNext (`tsconfig.app.json:6`). JSX: `react-jsx` (`tsconfig.app.json:15`). Path alias: `@/*` → `src/*` (`tsconfig.app.json:19-20`).

Typecheck script: `package.json:11` — `"typecheck": "tsc --noEmit -p tsconfig.app.json"`.

## Router

**Custom hash-based router** — no React Router or Next.js. Uses a `useRoute` hook.

Evidence — `src/App.tsx:8`:
```typescript
import { useRoute, navigate } from '@/hooks/useRoute';
```

Routing logic — `src/App.tsx:30,54-57`:
```typescript
if (route.path === '/admin') return <AdminPage />;
{route.path === '/' && <HomePage />}
{route.path === '/room' && <RoomPage roomId={route.params.roomId} />}
{route.path === '/profile' && <ProfilePage />}
{route.path === '/offline' && <OfflineScreen />}
{route.path === '/not-found' && ( ... )}
```

No `react-router-dom` in `package.json` dependencies.

## State Management

**React Context API** — four context providers, no Redux/Zustand/Jotai/React Query.

Provider tree — `src/App.tsx:82-89`:
```typescript
<ToastProvider>
  <AuthProvider>
    <NotificationsProvider>
      <PremiumProvider>
        <AppContent />
```

Context files:
- `src/context/AuthContext.tsx` — auth state, user object, session
- `src/context/PremiumContext.tsx` — premium features, app settings
- `src/context/ToastContext.tsx` — toast notifications
- `src/context/NotificationsContext.tsx` — notification bell state

Additional hooks for local state:
- `src/hooks/usePlayer.ts` — audio playback state (uses React state + a singleton `audioManager`)
- `src/hooks/useRoute.ts` — current route path/params
- `src/hooks/useOfflineCache.ts` — offline track caching
- `src/hooks/useOfflineTracks.ts` — offline track list
- `src/hooks/useBackgroundPreload.ts` — background prefetching

## UI Library

**Tailwind CSS only** (no shadcn, no MUI, no Chakra, no Radix).

Evidence — `package.json:31`:
```json
"tailwindcss": "^3.4.1",
```

Icons: **lucide-react 0.446.0** (`package.json:15`).

No other UI component library in dependencies.

## Styling Approach

**Tailwind CSS 3.4.1** with PostCSS + autoprefixer.

Config files:
- `tailwind.config.js` — custom color ramps (ink, electric, magenta), custom fonts, animations/keyframes
- `postcss.config.js` — `tailwindcss` + `autoprefixer` plugins
- `src/index.css` — `@tailwind base/components/utilities` + `@layer` definitions for custom component classes (`.glass-card`, `.btn-primary`, `.input-field`, etc.)

Custom CSS variables in `src/index.css:8-22`:
```css
:root {
  --ink-950: #0D0C0B;
  --ink-900: #0E0E18;
  ...
  --electric: #4D7CFE;
  --magenta: #FF3D9A;
}
```

## Testing Setup

**Playwright** — smoke test file exists at `e2e/smoke.spec.ts`.

NOT listed in `package.json` dependencies or devDependencies — Playwright is not installed as a dependency. The test file exists but cannot run without installing `@playwright/test`.

No Vitest, Jest, or other test framework in `package.json`.

No test script in `package.json` scripts section (`package.json:6-12`):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit -p tsconfig.app.json"
}
```

## Linting + Formatting

**ESLint 9.9.1** with `typescript-eslint` 8.3.0, `eslint-plugin-react-hooks` 5.1.0-rc.0, `eslint-plugin-react-refresh` 0.4.11.

Config: `eslint.config.js` — extends `js.configs.recommended` + `tseslint.configs.recommended`. Ignores `dist/` (`eslint.config.js:8`). Rules include react-hooks recommended rules and `react-refresh/only-export-components` warn.

Lint script: `package.json:9` — `"lint": "eslint ."`.

No Prettier or other formatter in dependencies.

## Deploy Target + Config

**Cloudflare Pages** (inferred from `_headers` and `_redirects` files in `public/`).

Evidence — `public/_headers` and `public/_redirects` exist. These are Cloudflare Pages config files.

Build output: `dist/` (default Vite output, confirmed by build producing `dist/index.html`, `dist/assets/*`).

No explicit deploy config file (no `wrangler.toml`, no `vercel.json`, no `netlify.toml`). The `dist/` output with `_headers` and `_redirects` is the standard Cloudflare Pages static deployment pattern.

## PWA Configuration

**Web App Manifest** — `public/manifest.webmanifest` (linked from `index.html:10`).

**Service Worker** — `public/sw.js`, registered in `src/main.tsx:9`.

PWA meta tags in `index.html:18-21`:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Vinyl" />
```

Icons in `public/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, favicons (multiple sizes).

## Service Worker Details

`src/main.tsx:6-68` — registers `/sw.js`, handles `updatefound` events, shows update toast via DOM, sends `SKIP_WAITING` and `PRECACHE_ASSETS` messages to the service worker.

## Other Notable Dependencies

- `@supabase/supabase-js ^2.57.4` (`package.json:14`) — Supabase client (database, auth, storage, realtime)
- `sharp ^0.35.5` (`package.json:30`) — image processing (used by `scripts/generate-icons.cjs` for icon generation, not in app runtime)
