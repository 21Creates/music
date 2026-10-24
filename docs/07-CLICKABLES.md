# 07 — Clickables (Complete Interactive Inventory)

Total interactive elements across `src/`: **413** (grep for `onClick|onSubmit|onChange|href=|<button|<input|<select|<textarea|role="button"` in `.tsx` files).

This document lists every button, input, select, textarea, and clickable element by page/component, with file:line evidence and what each does.

---

## Auth Screen (`src/components/AuthScreen.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Email input | 85 | `<input>` | User enters email |
| Password input | 96 | `<input type="password">` | User enters password |
| Display name input | 73 | `<input>` | User enters display name (signup only) |
| Sign In tab button | 67 | `<button>` | Switch to sign-in mode |
| Sign Up tab button | 68 | `<button>` | Switch to sign-up mode |
| Submit button | 106 | `<button>` | Calls `signIn()` or `signUp()` |

---

## Home Page (`src/pages/HomePage.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Room search input | 163 | `<input>` | Filter public rooms by name/description |
| "Have an invite code?" button | 155 | `<button>` | Opens InviteRedeemModal |
| Room card (member) | 142/301 | `<button>` | Navigate to `#/room?roomId=...` |
| Room card (non-member) | 236/258 | `<button>` | Navigate to room |
| Join Room button | 281 | `<button>` | Calls `join_room` RPC |
| Request to Join button | 287 | `<button>` | Calls `join_room` RPC (request mode) |
| Passphrase input | 265 | `<input>` | Enter passphrase for private rooms |
| Join with passphrase button | 272 | `<button>` | Calls `join_room` with passphrase |
| Create Room FAB | 206 | `<button>` | Opens CreateRoomModal (or shows limit toast) |
| Room Name input | 355 | `<input>` | Set room name |
| Description textarea | 367 | `<textarea>` | Set room description |
| Visibility select | 377 | `<select>` | public / private |
| Join Policy select | 384 | `<select>` | open / request |
| Passphrase input (create) | 394 | `<input>` | Set passphrase for private rooms |
| Discoverable toggle | 405 | `<button>` | Toggle discoverable flag |
| Theme color picker | 418 | `<button>` (×8) | Select theme color |
| Cancel (create) | 429 | `<button>` | Close modal |
| Create Room (submit) | 430 | `<button>` | Calls `create_room` RPC |
| Invite code input | 471 | `<input>` | Paste invite code |
| Redeem & Join button | 478 | `<button>` | Calls `redeem_invite` RPC |
| Invite modal close | 468 | `<button>` | Close modal |

---

## Room Page (`src/pages/RoomPage.tsx`)

### Hero Banner
| Element | Line | Type | Action |
|---|---|---|---|
| Back button | 138 | `<button>` | Navigate to `#/` |
| Share button (admin) | 165 | `<button>` | Open InviteShareModal |
| Settings button (admin) | 166 | `<button>` | Open RoomSettingsModal |

### Non-member join flow
| Element | Line | Type | Action |
|---|---|---|---|
| Join Room button | 202 | `<button>` | Calls `join_room` RPC |
| Passphrase input | 189 | `<input>` | Enter passphrase |
| Join with passphrase | 196 | `<button>` | Calls `join_room` with passphrase |

### Tab bar
| Element | Line | Type | Action |
|---|---|---|---|
| Queue tab | 225 | `<button>` | Switch to queue |
| Chat tab | 225 | `<button>` | Switch to chat |
| Members tab | 225 | `<button>` | Switch to members |
| Polls tab | 225 | `<button>` | Switch to polls |
| Games tab | 225 | `<button>` | Switch to games |
| Top Charts tab | 225 | `<button>` | Switch to leaderboard |

### Queue Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Add Music button | 300/312 | `<button>` | Open UploadModal |
| Track play button | 327 | `<button>` | Play track in player |
| Cover art file input | 349 | `<input type="file">` | Upload cover art for track |
| Track delete button | 355 | `<button>` | Delete track + audio file |
| Offline toggle (per track) | 343 | `<button>` | Save/remove offline (OfflineToggle component) |

### Chat Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Message text input | 894 | `<input>` | Type message (with @mention detection) |
| Send button | 901 | `<button>` | Insert message to `room_messages` |
| Attach media button (+) | 876 | `<button>` | Toggle media menu (premium) |
| Share track button | 887 | `<button>` | Toggle share track picker |
| Image upload input | 857 | `<input type="file">` | Upload image to vinyl-chat (premium) |
| Video upload input | 862 | `<input type="file">` | Upload video to vinyl-chat (premium) |
| GIF search button | 865 | `<button>` | Open GIF picker |
| GIF search input | 782 | `<input>` | Search Giphy |
| GIF result button | 791 | `<button>` | Select GIF |
| Track share picker item | 812 | `<button>` | Select track to share |
| Mention track item | 829/839 | `<button>` | Mention a track in message |
| Reply button | 737 | `<button>` | Set reply target |
| Delete message button | 739 | `<button>` | Delete own message |
| Media viewer close | 908-909 | `<button>` / overlay click | Close image viewer |
| Shared track play button | 717 | `<button>` | Play shared track from message |
| GIF/image click | 703/708 | `<button>` | Open media viewer |
| Reply preview cancel | 753 | `<button>` | Cancel reply |
| Pending media cancel | 761 | `<button>` | Remove pending media |
| Pending GIF cancel | 767 | `<button>` | Remove pending GIF |
| GIF picker close | 776 | `<button>` | Close GIF picker |
| Share picker close | 809 | `<button>` | Close track share picker |
| Media menu close | 868 | `<button>` | Close media menu |
| Crown (attachments locked) | 883 | `<button>` | Show premium upsell toast |

### Members Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Approve member button | 985 | `<button>` | Calls `approve_join_request` RPC |
| Reject member button | 988 | `<button>` | Calls `reject_join_request` RPC |
| Member role select | 1027 | `<select>` | Change member role (member/admin) |
| Remove member button | 1034 | `<button>` | Delete room_members row |

### Leaderboard Tab
| Element | Line | Type | Action |
|---|---|---|---|
| (Display only — no interactive elements beyond static list) | — | — | — |

### Upload Modal
| Element | Line | Type | Action |
|---|---|---|---|
| File drop zone | 1172 | `<div onClick>` | Click to open file picker |
| File input (audio/video) | 1180 | `<input type="file" multiple>` | Select audio/video files |
| Track title input | 1213 | `<input>` | Edit auto-extracted title |
| Cover art file input | 1204 | `<input type="file">` | Upload cover per track |
| Remove draft button | 1227 | `<button>` | Remove draft from list |
| Add more files button | 1238 | `<button>` | Open file picker again |
| Cancel button | 1258 | `<button>` | Close modal |
| Upload button | 1260 | `<button>` | Upload all tracks to storage + DB |
| Modal close (X) | 1168 | `<button>` | Close modal |
| Modal backdrop click | 1164 | overlay click | Close modal |

---

## Room Settings Modal (`src/components/RoomSettingsModal.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Invite code input (read-only) | 96 | `<input>` | Display invite code |
| Copy invite code button | 97 | `<button>` | Copy to clipboard |
| Room name input | 106 | `<input>` | Edit room name |
| Description textarea | 110 | `<textarea>` | Edit description |
| Visibility select | 115 | `<select>` | public / private |
| Join Policy select | 122 | `<select>` | open / request |
| Discoverable toggle | 132 | `<button>` | Toggle discoverable |
| Theme color picker | 152 | `<button>` (×7) | Select theme color |
| Member role select | 177 | `<select>` | Change member role |
| Remove member button | 185 | `<button>` | Remove member |
| Cancel button | 197 | `<button>` | Close modal |
| Save Changes button | 198 | `<button>` | Update room in DB |
| Close (X) | 90 | `<button>` | Close modal |

### Invite Share Modal (same file)
| Element | Line | Type | Action |
|---|---|---|---|
| Room code input (read-only) | 265 | `<input>` | Display code |
| Copy room code | 266 | `<button>` | Copy to clipboard |
| Room link input (read-only) | 274 | `<input>` | Display URL |
| Copy room link | 275 | `<button>` | Copy to clipboard |
| Generate invite button | 285 | `<button>` | Create invitation row |
| Copy invite link | 307 | `<button>` | Copy single-use link |
| Close (X) | 259 | `<button>` | Close modal |

---

## Jam Banner (`src/components/JamBanner.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Start Jam button | 86 | `<button>` | Calls `start_jam` RPC |
| End Jam button | 116 | `<button>` | Calls `end_jam` RPC |
| Join button | 120 | `<button>` | Navigate to room |

---

## Polls Tab (`src/components/PollsTab.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| New Poll button | 93 | `<button>` | Open CreatePollModal |
| Vote option button | 132 | `<button>` | Insert poll_vote |
| Question input | 202 | `<input>` | Set poll question |
| Type select | 204 | `<select>` | poll / survey |
| Multi-choice checkbox | 209 | `<input type="checkbox">` | Toggle multiple choice |
| Option input | 216 | `<input>` | Enter option text |
| Remove option button | 223 | `<button>` | Remove option |
| Add option button | 230 | `<button>` | Add option field |
| Cancel button | 236 | `<button>` | Close modal |
| Create button (submit) | 237 | `<button>` | Insert poll + options |
| Close (X) | 199 | `<button>` | Close modal |

---

## Games Tab (`src/components/GamesTab.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| New Game button | 257 | `<button>` | Open CreateGameModal |
| Game card button | 278 | `<button>` | Open game detail |
| Start Playing button | 230 | `<button>` | Insert game_plays, start playing |
| Answer choice button | 196 | `<button>` | Submit answer to game_session_answers |
| Next Question / Finish button | 208 | `<button>` | Advance to next question or finish |
| Back to games button | 218 | `<button>` | Return to game list |
| Game title input | 351 | `<input>` | Set game title |
| Game type select | 353 | `<select>` | Select game type |
| Duration input | 360 | `<input type="number">` | Set duration in seconds |
| Question text input | 373 | `<input>` | Enter question |
| Correct answer input | 374 | `<input>` | Enter correct answer |
| Wrong option input (×3) | 377 | `<input>` | Enter wrong choices |
| Remove question button | 368 | `<button>` | Remove question |
| Add question button | 382 | `<button>` | Add question field |
| Cancel button | 387 | `<button>` | Close modal |
| Create Game button (submit) | 388 | `<button>` | Insert game_session + questions |
| Close (X) | 348 | `<button>` | Close modal |

---

## Mini Player (`src/components/MiniPlayer.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Expand button (track info) | 48 | `<button>` | Open NowPlayingView |
| Previous button | 78 | `<button>` | Play previous track |
| Play/Pause button | 79 | `<button>` | Toggle playback |
| Next button | 82 | `<button>` | Play next track |
| Mute button | 94 | `<button>` | Toggle mute |
| Volume slider | 97 | `<input type="range">` | Set volume |

---

## Now Playing View (`src/components/NowPlayingView.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Close button (X) | 79 | `<button>` | Close view |
| Backdrop click | 77 | overlay click | Close view |
| Seek bar | 108 | `<div onClick>` | Seek to position |
| Like/Heart button | 125 | `<button>` | Toggle like (local state only — non-functional) |
| Previous button | 128 | `<button>` | Previous track |
| Play/Pause button | 129 | `<button>` | Toggle playback |
| Next button | 132 | `<button>` | Next track |
| Share button | 133 | `<button>` | Copy room link to clipboard |
| Mute button | 138 | `<button>` | Toggle mute |
| Volume slider | 141 | `<input type="range">` | Set volume |
| Mix Mode button | 144 | `<button>` | Toggle mix mode (premium-gated) |
| Offline toggle | 155 | `<OfflineToggle>` | Save/remove offline |

---

## Sidebar (`src/components/Sidebar.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Discover nav button | 42 | `<button>` | Navigate to `#/` |
| Offline Library nav button | 42 | `<button>` | Navigate to `#/offline` |
| Profile nav button | 42 | `<button>` | Navigate to `#/profile` |
| Go Premium button | 58 | `<button>` | Navigate to `#/profile` (if not premium) |
| Notifications bell | 56 | `<NotificationsBell>` | Open notifications dropdown |
| User avatar menu button | 67 | `<button>` | Toggle user menu |
| Sign Out button | 85 | `<button>` | Stop player + sign out |

---

## Mobile Nav (`src/components/MobileNav.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Logo/Home button | 22 | `<button>` | Navigate to `#/` |
| Home tab | 51 | `<button>` | Navigate to `#/` |
| Offline tab | 51 | `<button>` | Navigate to `#/offline` |
| Profile tab | 51 | `<button>` | Navigate to `#/profile` |
| Crown (premium) button | 31 | `<button>` | Navigate to `#/profile` |
| Avatar button | 35 | `<button>` | Navigate to `#/profile` |
| Notifications bell | 29 | `<NotificationsBell>` | Open notifications dropdown |

---

## Notifications Bell (`src/components/NotificationsBell.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Bell button | 44 | `<button>` | Toggle dropdown |
| Mark all read button | 62 | `<button>` | Mark all notifications read |
| Notification item | 76 | `<button>` | Mark read + navigate to room |

---

## Install Prompt (`src/components/InstallPrompt.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Dismiss (X) button | 81 | `<button>` | Dismiss + save to localStorage |
| Not now button | 118 | `<button>` | Dismiss + save to localStorage |
| Install button | 121 | `<button>` | Trigger `beforeinstallprompt` |

---

## Offline Toggle (`src/components/OfflineToggle.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Save/Remove offline button | 57/74 | `<button>` | Save track for offline or remove it |

---

## Profile Page (`src/pages/ProfilePage.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Avatar upload input | 95 | `<input type="file">` | Upload avatar to vinyl-avatars |
| Overview tab | 129 | `<button>` | Switch to overview |
| Settings tab | 129 | `<button>` | Switch to settings |
| Premium tab | 129 | `<button>` | Switch to premium |
| Display name input | 176 | `<input>` | Edit display name |
| Avatar URL input | 180 | `<input>` | Edit avatar URL directly |
| Email input (disabled) | 184 | `<input>` | Display email (read-only) |
| Save Changes button | 186 | `<button>` | Update profiles table |
| Notification toggle switches | 201 | `<button>` (×5) | Non-functional toggles |
| Default volume slider | 214 | `<input type="range">` | Set audioManager volume |
| Crossfade toggle | 218 | `<button>` | Toggle crossfade |
| Sign Out button | 223 | `<button>` | Sign out |
| Upgrade to Premium button | 246 | `<button>` | Open SubscribeModal |

---

## Offline Screen (`src/pages/OfflineScreen.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Play track button | 146 | `<button>` | Play offline track |
| Remove track button | 160 | `<button>` | Remove from offline storage |
| Remove all button | 119 | `<button>` | Remove all offline tracks |

---

## Subscribe Modal (`src/components/SubscribeModal.tsx`)

| Element | Line | Type | Action |
|---|---|---|---|
| Payment ref input | ~120 | `<input>` | Enter payment reference number |
| Receipt file input | ~130 | `<input type="file">` | Upload receipt image |
| Submit button | ~140 | `<button>` | Upload receipt, insert subscription, call edge function |
| Close button | ~100 | `<button>` | Close modal |
| Backdrop click | ~95 | overlay click | Close modal |

---

## Admin Page (`src/pages/AdminPage.tsx`) — 12 tabs

### Admin Login
| Element | Line | Type | Action |
|---|---|---|---|
| Password input | 182 | `<input type="password">` | Enter admin password |
| Login button | 188 | `<button>` | Call `verify_admin_password` RPC |
| Show/hide password toggle | ~185 | `<button>` | Toggle password visibility |

### Overview Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Stat cards (display only) | — | — | Show platform metrics |

### Users Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Search input | — | `<input>` | Search users |
| Grant Premium button | — | `<button>` | Call `admin_grant_premium` |
| Revoke Premium button | — | `<button>` | Call `admin_revoke_premium` |
| Ban/Unban button | — | `<button>` | Toggle user ban |

### Rooms Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Search input | — | `<input>` | Search rooms |
| Delete room button | — | `<button>` | Delete room |

### Premium Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Approve button | — | `<button>` | Call `admin_approve_subscription` |
| Reject button | — | `<button>` | Call `admin_reject_subscription` |

### Ads Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Create Ad button | — | `<button>` | Open ad creation form |
| Toggle Ad button | — | `<button>` | Call `admin_toggle_ad` |
| Edit Ad button | — | `<button>` | Open ad edit form |
| Delete Ad button | — | `<button>` | Call `admin_delete_ad` |
| Ad title/content inputs | — | `<input>`/`<textarea>` | Edit ad content |

### Announcements Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Announcement textarea | — | `<textarea>` | Enter announcement text |
| Send button | — | `<button>` | Call `admin_send_announcement` |

### Analytics Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Days range buttons (7/14/30/90) | 2032 | `<button>` (×4) | Set analytics time range |

### Logs Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Search input | 2144 | `<input>` | Search activity logs |
| Action type select | 2146 | `<select>` | Filter by action type |
| Export button | 2157 | `<button>` | Export logs as JSON |
| Load More button | 2183 | `<button>` | Load more logs (pagination) |

### Export Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Export Everything button | 2252 | `<button>` | Export all tables as JSON |
| Per-table Export buttons | 2268 | `<button>` (×6) | Export individual table |

### Bug Check Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Re-run Check button | 2328 | `<button>` | Call `admin_bug_check` |
| Fix button (per issue) | 2354 | `<button>` | Call `admin_fix_bug` |

### Webhook Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Webhook URL input | ~1815 | `<input>` | Set Apps Script webhook URL |
| Save button | ~1825 | `<button>` | Call `admin_save_settings` |
| Test Ping button | ~1835 | `<button>` | Send test POST to webhook URL |
| Copy Apps Script button | ~1800 | `<button>` | Copy template to clipboard |

### Settings Tab
| Element | Line | Type | Action |
|---|---|---|---|
| Max Rooms Free input | 2459 | `<input type="number">` | Set free room limit |
| Max Rooms Premium input | 2462 | `<input type="number">` | Set premium room limit |
| Popup Title input | 2468 | `<input>` | Edit premium popup title |
| Popup Body textarea | 2472 | `<textarea>` | Edit premium popup body |
| CTA Label input | 2476 | `<input>` | Edit CTA label |
| Save & Publish button | 2478 | `<button>` | Call `admin_save_settings` |
| Add Payment button | 2489 | `<button>` | Open PaymentForm modal |
| Edit Payment button | 2502 | `<button>` | Open PaymentForm with existing data |
| Change Password toggle | 2518 | `<button>` | Expand password change form |
| New Password input | 2527 | `<input type="password">` | Enter new admin password |
| Show/hide password | 2528 | `<button>` | Toggle password visibility |
| Confirm Password input | 2535 | `<input type="password">` | Re-enter new password |
| Update Password button | 2537 | `<button>` | Call `admin_change_password` |
| Payment Form: Bank Name | 2593 | `<input>` | — |
| Payment Form: Account Name | 2597 | `<input>` | — |
| Payment Form: Account Number | 2601 | `<input>` | — |
| Payment Form: Routing Number | 2605 | `<input>` | — |
| Payment Form: Instructions | 2609 | `<textarea>` | — |
| Payment Form: Custom Heading | 2613 | `<input>` | — |
| Payment Form: Custom Subtext | 2617 | `<input>` | — |
| Payment Form: Footer Note | 2621 | `<input>` | — |
| Payment Form: Active checkbox | 2624 | `<input type="checkbox">` | Toggle active status |
| Payment Form: Save button | 2628 | `<button>` | Call `admin_save_payment_details` |
| Payment Form: Close (X) | 2588 | `<button>` | Close modal |

### Admin Tab Bar (always visible)
| Element | Line | Type | Action |
|---|---|---|---|
| Tab buttons (×12) | ~230 | `<button>` (×12) | Switch admin tabs |
| Logout button | ~155 | `<button>` | Clear admin password state |

---

## Summary by page

| Page/Component | Interactive elements (approx) |
|---|---|
| AdminPage.tsx | ~80 |
| RoomPage.tsx | ~50 |
| HomePage.tsx | ~25 |
| ProfilePage.tsx | ~15 |
| RoomSettingsModal.tsx | ~20 |
| GamesTab.tsx | ~15 |
| PollsTab.tsx | ~12 |
| MiniPlayer.tsx | 6 |
| NowPlayingView.tsx | ~10 |
| Sidebar.tsx | 7 |
| MobileNav.tsx | 7 |
| NotificationsBell.tsx | 3 |
| OfflineScreen.tsx | 3 |
| AuthScreen.tsx | 6 |
| InstallPrompt.tsx | 3 |
| JamBanner.tsx | 3 |
| OfflineToggle.tsx | 1 |
| SubscribeModal.tsx | ~5 |
