# 06 — Routes

Custom hash-based router (`src/hooks/useRoute.ts`). No React Router.

## Route Table

| Path | Component | Guard | Renders |
|---|---|---|---|
| `#/admin` | `AdminPage.tsx` | Password gate (`App.tsx:30`, before auth check) | Admin login → 12-tab dashboard |
| `#/` | `HomePage.tsx` | `if (!user) return <AuthScreen />` (`App.tsx:45`) | Room discovery, create room |
| `#/room?roomId=<uuid>` | `RoomPage.tsx` | Auth required (`App.tsx:55`) | Tracks, chat, polls, games, jam |
| `#/profile` | `ProfilePage.tsx` | Auth required (`App.tsx:56`) | Profile, settings, premium |
| `#/offline` | `OfflineScreen.tsx` | Auth required (`App.tsx:57`) | Offline track list |
| `#/not-found` | Inline (`App.tsx:58-69`) | Auth required | 404 page |

## Navigation
`navigate(path)` (`useRoute.ts:30-33`) sets `window.location.hash` and scrolls to top.

## Route Parsing (`useRoute.ts:8-16`)
Parses `window.location.hash` into `{ path, params }`. Query params parsed via `URLSearchParams`. Only params used: `roomId` (`App.tsx:55`) and `invite` (`HomePage.tsx:29-33`).

## Layout Structure
- **Signed-in pages** (`App.tsx:47-77`): `<Sidebar />` + `<MobileNav />` + `<main>` + `<MiniPlayer />` + `<NowPlayingView />` + `<InstallPrompt />`
- **Admin page** (`App.tsx:30`): Standalone — no sidebar/nav/player
- **Auth screen** (`App.tsx:45`): Standalone login/signup form
- **Loading** (`App.tsx:32-43`): Spinner while session loads

## No Premium/Admin Route Guards
No route-level premium guard. Premium features gated at component level (e.g., `usePremium().hasFeature('game_access')`). Admin route guarded by password, not by `is_admin` profile flag.
