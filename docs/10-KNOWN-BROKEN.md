# 10 — Known Broken / Incomplete / Security Issues

## 1. "Unable to reach the server" — Admin login error

**File:** `src/pages/AdminPage.tsx:146`
```typescript
if (rpcError) {
  setError('Unable to reach the server. Please check your connection and try again.');
}
```

When `verify_admin_password` RPC fails (network error, function not found, or permission error), the user sees a generic "Unable to reach the server" message. The actual error from Supabase is swallowed — `rpcError.message` is never shown. This makes debugging admin login failures impossible.

**Impact:** Admin cannot log in if the RPC is unavailable, and gets no useful error message.

## 2. `comments` table — orphaned schema (never used by client)

**Evidence:** `comments` table created in `002:170`. Grep for `.from('comments')` in `src/` returns **zero matches**.

The table exists with RLS enabled, but no component reads or writes it. The comments feature was either never built or was removed. The `notifications` type includes `comment_on_track` and `reply_to_comment` (`NotificationsBell.tsx:8-9`), suggesting comments were planned.

**Impact:** Dead schema. The rebuild agent should decide whether to build the comments feature or drop the table.

## 3. Ads system — admin-only, never displayed to users

**Evidence:** `ads` and `ad_impressions` tables exist (`004:6,50`). Admin RPCs exist for CRUD (`admin_create_ad`, `admin_toggle_ad`, etc.). However, **no client component renders ads to users**. Grep for `.from('ads')` in `src/` outside of `AdminPage.tsx` returns zero matches.

**Impact:** Admin can create ads that nobody sees. The ad display component is missing.

## 4. Notification settings toggles are non-functional

**File:** `src/pages/ProfilePage.tsx:198-205`

The Settings tab shows notification toggle switches for "Jam sessions", "Comments on your tracks", "Replies to your comments", "New polls and games", "Room announcements". Each uses a `ToggleSwitch` component with `defaultOn={true}`.

**However:** The `ToggleSwitch` component (`ProfilePage.tsx:280-296`) only updates local React state. There is no API call, no database update, no Supabase write. The toggles do nothing — they reset on page reload.

**Impact:** Users cannot actually configure notification preferences.

## 5. `profile.is_admin` shown but never used for access control

**File:** `src/pages/ProfilePage.tsx:103`
```typescript
{profile?.is_admin && <span className="badge-blue">Admin</span>}
```

The profile page shows an "Admin" badge if `is_admin` is true, but this flag is never checked to gate any UI or route. The admin dashboard uses a separate password-based auth. A regular user with `is_admin = true` gets a badge but no admin powers through the regular app.

## 6. Webhook signature not verified by Apps Script

**File:** `src/pages/AdminPage.tsx:1591-1788` (APPS_SCRIPT_TEMPLATE)

The edge function signs the webhook payload with HMAC-SHA256 (`send-subscription-webhook/index.ts:121`) and sends `X-Vinyl-Signature` and `X-Vinyl-Timestamp` headers. However, the Apps Script template does NOT verify the signature — it accepts all incoming POSTs without checking.

**Impact:** Anyone who discovers the Apps Script URL can send fake payment notifications. The admin's email will receive fraudulent subscription alerts.

## 7. Giphy API uses public beta key (hardcoded)

**File:** `src/pages/RoomPage.tsx:607`
```typescript
const res = await fetch(`https://media.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=...`);
```

The Giphy public beta key `dc6zaTOxFJmzC` is hardcoded directly in the source. This key is rate-limited and shared across all apps using it. It should be moved to an env var or edge function proxy.

## 8. Admin password minimum length is 4 characters

**File:** `src/pages/AdminPage.tsx:2416`
```typescript
if (newPw.length < 4) { toast.error('New password must be at least 4 characters'); return; }
```

The admin password change enforces only 4 characters minimum. This is very weak for an admin credential that grants full platform control.

## 9. Like button in NowPlayingView is non-functional

**File:** `src/components/NowPlayingView.tsx:125`
```typescript
<button onClick={() => setLiked(!liked)} className="btn-icon">
  <Heart className={`w-6 h-6 ${liked ? 'fill-magenta-500 text-magenta-500' : ''}`} />
</button>
```

The heart/like button only toggles local React state (`liked`). There is no database write, no `track_likes` table, no RPC call. The like is lost on page reload.

## 10. `shareTrackId` mention system conflates track mentions with track sharing

**File:** `src/pages/RoomPage.tsx:664-670`

When a user types `@` in the chat input, a track mention dropdown appears. Selecting a track replaces the `@` text with the track title AND sets `shareTrackId`. This means every track mention also shares the track card in the message. There is no way to mention a track by name without sharing it.

## 11. Admin route accessible without any auth

**File:** `src/App.tsx:30`

The `#/admin` route is rendered before the auth check (`App.tsx:45`). Anyone can navigate to `#/admin` without being signed in. The password gate is the only barrier. If the `verify_admin_password` RPC is ever compromised or the password is leaked, the admin dashboard is fully accessible with no additional auth layer.

## 12. No `room_messages` RLS check for room membership

The `room_messages` table has RLS enabled, but the policies allow any authenticated user to INSERT messages into any room — there is no check that the user is a member of the room. A signed-in user could send messages to rooms they haven't joined by calling the Supabase client directly.

## 13. Offline storage not persisted reliably

**File:** `src/pages/OfflineScreen.tsx:52`
```typescript
const persisted = navigator.storage?.persisted ? true : false;
```

This line is wrong — `navigator.storage.persisted` is a function that returns a Promise, not a boolean. The code checks `navigator.storage?.persisted` which is always truthy (it's a function reference), so `persisted` is always `true`. The actual persistence status is never checked.

## 14. `listening_events` table queried but never cleaned up

**File:** `src/components/NowPlayingView.tsx:27-32`

The NowPlayingView inserts into `listening_events` every 15 seconds while open. There is no cleanup or TTL on this table — it grows indefinitely.

## 15. No rate limiting on any user-facing RPC

Functions like `create_room`, `join_room`, `redeem_invite`, `start_jam` have no rate limiting. A malicious user could spam room creation, join requests, or jam sessions.
