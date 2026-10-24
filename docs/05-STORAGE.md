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
| `src/pages/ProfilePage.tsx:67` | `vinyl-avatars` | Gets public URL for uploaded avatar |
| `src/pages/RoomPage.tsx:286` | `vinyl-covers` | Gets public URL for uploaded track cover art |
| `src/pages/RoomPage.tsx:1113` | `vinyl-covers` | Gets public URL for uploaded cover during track upload |
| `src/pages/RoomPage.tsx:599` | `vinyl-chat` | Gets public URL for uploaded chat media |

## createSignedUrl calls

| File:line | Bucket | Usage |
|---|---|---|
| `src/lib/audioUrl.ts:23-25` | `vinyl-audio` | Creates signed URL for audio playback (1-hour expiry, `SIGNED_URL_EXPIRY = 3600`) |
| `supabase/functions/send-subscription-webhook/index.ts:98-101` | `vinyl-receipts` | Creates signed URL (3600s) for receipt image in webhook notification email |

## Upload surfaces

| Surface | File:line | Bucket | Who can upload |
|---|---|---|---|
| Avatar upload | `src/pages/ProfilePage.tsx:65` | `vinyl-avatars` | Any authenticated user |
| Track audio upload | `src/pages/RoomPage.tsx:1129` | `vinyl-audio` | Room admins |
| Track/room cover upload | `src/pages/RoomPage.tsx:1108,1129` | `vinyl-covers` | Room admins |
| Chat media upload | `src/pages/RoomPage.tsx:594` | `vinyl-chat` | Room members with premium `chat_attachments` feature |
| Payment receipt upload | `src/components/SubscribeModal.tsx:43` | `vinyl-receipts` | Any authenticated user |

## Delete surfaces

| Surface | File:line | Bucket |
|---|---|---|
| Track audio delete | `src/pages/RoomPage.tsx:268` | `vinyl-audio` |
| Receipt | NOT FOUND | `vinyl-receipts` (no client-side delete) |

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

The edge function `send-subscription-webhook/index.ts:98-101` calls `createSignedUrl` on `vinyl-receipts` with 3600s expiry to include a temporary receipt image URL in the webhook notification. This correctly handles the private bucket — the signed URL expires after 1 hour.
