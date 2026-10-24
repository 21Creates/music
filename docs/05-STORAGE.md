# 05 — Storage

## Buckets

| Bucket | Public? | Created in | Purpose |
|---|---|---|---|
| `vinyl-audio` | **private** (set false in `6a:50`) | `002:57` | Audio track files |
| `vinyl-covers` | public | `002:61` | Room and track cover images |
| `vinyl-avatars` | public | `002:65` | User avatar images |
| `vinyl-chat` | public | `008:28` | Chat media (images, videos) |
| `vinyl-receipts` | **private** | `6a:81` | Payment receipt uploads |

## getPublicUrl calls

| File:line | Bucket | Usage |
|---|---|---|
| `src/pages/ProfilePage.tsx` | `vinyl-avatars` | Gets public URL for uploaded avatar |
| `src/pages/RoomPage.tsx` | `vinyl-covers` | Gets public URL for uploaded cover image |
| `src/pages/RoomPage.tsx` | `vinyl-chat` | Gets public URL for uploaded chat media |

Evidence from grep — `src/` `.from('vinyl-avatars').getPublicUrl` / `.from('vinyl-covers').getPublicUrl` / `.from('vinyl-chat').getPublicUrl`

## createSignedUrl calls

| File:line | Bucket | Usage |
|---|---|---|
| `src/lib/audioUrl.ts:23-25` | `vinyl-audio` | Creates signed URL for audio playback (1-hour expiry, `SIGNED_URL_EXPIRY = 3600`) |

This is the ONLY `createSignedUrl` call in the codebase. Audio is the only private bucket requiring signed URLs.

## Upload surfaces

| Surface | File:line | Bucket | Who can upload |
|---|---|---|---|
| Avatar upload | `src/pages/ProfilePage.tsx` | `vinyl-avatars` | Any authenticated user |
| Track audio upload | `src/pages/RoomPage.tsx` | `vinyl-audio` | Room members |
| Track/room cover upload | `src/pages/RoomPage.tsx` | `vinyl-covers` | Room members |
| Chat media upload | `src/pages/RoomPage.tsx` | `vinyl-chat` | Room members |
| Payment receipt upload | `src/components/SubscribeModal.tsx:43` | `vinyl-receipts` | Any authenticated user |

## Delete surfaces

| Surface | File:line | Bucket |
|---|---|---|
| Track audio delete | `src/pages/RoomPage.tsx` | `vinyl-audio` |
| Receipt N/A | NOT FOUND | `vinyl-receipts` (no client-side delete) |

## Storage policies (final state after migration `6a`)

- **vinyl-audio**: SELECT (authenticated), INSERT (authenticated), DELETE (authenticated + `owner = auth.uid()`)
- **vinyl-covers**: SELECT (public — no auth needed), INSERT (authenticated), DELETE (authenticated + owner)
- **vinyl-avatars**: SELECT (public), INSERT (authenticated), DELETE (authenticated + owner)
- **vinyl-chat**: SELECT (authenticated only), INSERT (authenticated + owner), DELETE (authenticated + owner)
- **vinyl-receipts**: SELECT (authenticated + owner only), INSERT (authenticated + owner), DELETE (authenticated + owner)

## What breaks if public buckets are made private

- **vinyl-covers** → Room and track cover images would fail to load. `RoomPage.tsx` uses `getPublicUrl` to display covers. No signed URL fallback exists for covers.
- **vinyl-avatars** → User avatars would fail to load. `ProfilePage.tsx` uses `getPublicUrl`. No signed URL fallback exists for avatars.
- **vinyl-chat** → Chat media images would fail to load. `RoomPage.tsx` uses `getPublicUrl` for chat media display. No signed URL fallback exists.

Only `vinyl-audio` has a signed URL pattern (`audioUrl.ts`). The other three public buckets have no signed URL fallback — making them private would break all image display.

## Edge function receipt access

The edge function `send-subscription-webhook/index.ts` calls `getPublicUrl` on `vinyl-receipts` to include the receipt image in the webhook notification email. Since `vinyl-receipts` is **private**, `getPublicUrl` will NOT return a usable URL — it returns a URL that only works with auth headers. This means receipt images in notification emails will be broken unless the edge function uses `createSignedUrl` instead (see 10-KNOWN-BROKEN.md for details).
