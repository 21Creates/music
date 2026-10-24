# 05 — Storage

## Buckets

| Bucket | Public? | Created | Purpose |
|---|---|---|---|
| `vinyl-audio` | private | `002:57` | Audio track files |
| `vinyl-covers` | public | `002:61` | Room and track cover images |
| `vinyl-avatars` | public | `002:65` | User avatar images |
| `vinyl-chat` | public | `008:28` | Chat media (images, videos) |
| `vinyl-receipts` | private | `6a:81` | Payment receipt uploads |

## getPublicUrl Calls
| File:line | Bucket | Usage |
|---|---|---|
| `src/pages/ProfilePage.tsx:67` | `vinyl-avatars` | Avatar URL |
| `src/pages/RoomPage.tsx:286` | `vinyl-covers` | Track cover art |
| `src/pages/RoomPage.tsx:1113` | `vinyl-covers` | Cover during track upload |
| `src/pages/RoomPage.tsx:599` | `vinyl-chat` | Chat media URL |

## createSignedUrl Calls
| File:line | Bucket | Usage |
|---|---|---|
| `src/lib/audioUrl.ts:23-25` | `vinyl-audio` | Signed URL for audio playback (1-hour expiry) |
| `supabase/functions/send-subscription-webhook/index.ts:98-101` | `vinyl-receipts` | Signed URL (3600s) for receipt in webhook notification |

## Upload Surfaces
| Surface | File:line | Bucket | Who |
|---|---|---|---|
| Avatar upload | `ProfilePage.tsx:65` | `vinyl-avatars` | Any authenticated user |
| Track audio upload | `RoomPage.tsx:1129` | `vinyl-audio` | Room admins |
| Track/room cover | `RoomPage.tsx:1108,1129` | `vinyl-covers` | Room admins |
| Chat media | `RoomPage.tsx:594` | `vinyl-chat` | Premium users with `chat_attachments` |
| Payment receipt | `SubscribeModal.tsx:43` | `vinyl-receipts` | Any authenticated user |

## Storage Policies (after migration `6a`)
- **vinyl-audio**: SELECT/INSERT (authenticated), DELETE (owner check)
- **vinyl-covers**: SELECT (public), INSERT/DELETE (authenticated + owner)
- **vinyl-avatars**: SELECT (public), INSERT/DELETE (authenticated + owner)
- **vinyl-chat**: SELECT/INSERT/DELETE (authenticated + owner)
- **vinyl-receipts**: SELECT/INSERT/DELETE (authenticated + owner only)

## What Breaks If Public Buckets Go Private
- **vinyl-covers** -> Room/track covers fail to load (uses `getPublicUrl`, no signed URL fallback)
- **vinyl-avatars** -> Avatars fail to load (uses `getPublicUrl`, no signed URL fallback)
- **vinyl-chat** -> Chat media fails to load (uses `getPublicUrl`, no signed URL fallback)

Only `vinyl-audio` has a signed URL pattern (`audioUrl.ts`). The other three have no fallback.

## Edge Function Receipt Access
`send-subscription-webhook/index.ts:98-101` uses `createSignedUrl` on `vinyl-receipts` with 3600s expiry — correctly handles the private bucket.
