# 06 — Routes

The app uses a **custom hash-based router** (`src/hooks/useRoute.ts`). No React Router. Routes are parsed from `window.location.hash`.

## Route table

| Path | Component file | Who can reach it | Guard (file:line) | What it renders |
|---|---|---|---|---|
| `#/admin` | `src/pages/AdminPage.tsx` | Anyone (password required) | `App.tsx:30` — rendered before auth check | Admin login form, then dashboard with 12 tabs |
| `#/` | `src/pages/HomePage.tsx` | Any signed-in user | `App.tsx:45` — `if (!user) return <AuthScreen />` | Room discovery, create room, joined rooms |
| `#/room?roomId=<uuid>` | `src/pages/RoomPage.tsx` | Any signed-in user | `App.tsx:45,55` | Room page with tracks, chat, polls, games, jam |
| `#/profile` | `src/pages/ProfilePage.tsx` | Any signed-in user | `App.tsx:45,56` | User profile, stats, avatar, settings |
| `#/offline` | `src/pages/OfflineScreen.tsx` | Any signed-in user | `App.tsx:45,57` | Offline track list, storage usage |
| `#/not-found` | Inline in `App.tsx:58-69` | Any signed-in user | `App.tsx:45,58` | 404 page with "Back to Home" button |

## Navigation function

`navigate(path)` (`useRoute.ts:30-33`) sets `window.location.hash = path` and scrolls to top.

## Layout structure

- **Signed-in pages** (`App.tsx:47-77`): `<Sidebar />` (desktop) + `<MobileNav />` (mobile) + `<main>` with page content + `<MiniPlayer />` + `<NowPlayingView />` + `<InstallPrompt />`
- **Admin page** (`App.tsx:30`): Standalone — no sidebar, no nav, no player. Full-screen admin dashboard.
- **Auth screen** (`App.tsx:45`): Standalone login/signup form when not signed in.
- **Loading state** (`App.tsx:32-43`): Spinner with Vinyl logo while auth session loads.

## Route parsing

`useRoute.ts:8-16`:
```typescript
function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params: Record<string, string> = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
  }
  return { path: path || '/', params };
}
```

Query params are parsed into `route.params`. The only params used are `roomId` (`App.tsx:55`) and `invite` (`HomePage.tsx:29-33`).

## No premium/admin route guards on app pages

There is no route-level premium guard. Premium features are gated at the component level (e.g., `usePremium().hasFeature('game_access')` in `GamesTab.tsx:66`). The admin route is guarded by password, not by the `is_admin` profile flag.
