# 10 — Known Broken / Incomplete / Security Issues

## 1. Admin login error message swallows actual error
**File:** `AdminPage.tsx:146` — Shows "Unable to reach the server" for any RPC failure. Actual `rpcError.message` never displayed. Makes debugging impossible.

## 2. `comments` table — orphaned schema
Created in `002:170` but never queried by client code (zero `.from('comments')` matches in `src/`). Feature never built or removed. Notification types `comment_on_track` and `reply_to_comment` still exist in `NotificationsBell.tsx:8-9`.

## 3. Ads system — admin-only, never displayed
`ads`/`ad_impressions` tables exist with admin CRUD RPCs, but no client component renders ads. Grep for `.from('ads')` outside AdminPage returns zero matches.

## 4. Notification settings toggles are non-functional
**File:** `ProfilePage.tsx:201` — Five toggle switches only update local React state. No API call, no DB write. Reset on reload.

## 5. `profile.is_admin` shown but never used for access control
`ProfilePage.tsx:103` shows "Admin" badge but the flag never gates any UI. Admin dashboard uses separate password auth.

## 6. Webhook signature not verified by Apps Script
Edge function signs payload with HMAC-SHA256 (`send-subscription-webhook/index.ts:121`), but Apps Script template (`AdminPage.tsx:1591-1788`) does NOT verify. Anyone with the URL can send fake payment notifications.

## 7. Giphy API uses hardcoded public beta key
`RoomPage.tsx:607` — Key `dc6zaTOxFJmzC` hardcoded in source. Rate-limited, shared across all apps.

## 8. Admin password minimum is 4 characters
`AdminPage.tsx:2416` — Very weak for a credential granting full platform control.

## 9. Like button is non-functional
`NowPlayingView.tsx:125` — Only toggles local state. No DB write, no `track_likes` table. Lost on reload.

## 10. Track mention always shares track card
`RoomPage.tsx:664-670` — Selecting a track from @mention dropdown sets `shareTrackId`. No way to mention without sharing.

## 11. Admin route accessible without any auth
`App.tsx:30` — `#/admin` rendered before auth check. Password is the only barrier.

## 12. No room membership check on message insert
`room_messages` RLS allows any authenticated user to INSERT into any room — no check that user is a member.

## 13. Offline persistence check is broken
`OfflineScreen.tsx:52` — `navigator.storage?.persisted` is a function, not a boolean. Code checks truthiness of function reference, always returns `true`.

## 14. `listening_events` grows indefinitely
`NowPlayingView.tsx:27-32` inserts every 15 seconds. No cleanup or TTL.

## 15. No rate limiting on user-facing RPCs
`create_room`, `join_room`, `redeem_invite`, `start_jam` have no rate limiting. Vulnerable to spam.
