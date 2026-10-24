# Vinyl — Product Spec (one page)
**Core loop:** discover → play → save offline → pay.
**Brand:** Vinyl Black #0D0C0B (background), Groove Charcoal #1B1917 (cards), Sleeve Cream #F3ECDD (text), White Label Acid #DFFF3F (accent, under 10% of screen), Groove Gray #8A8378 (muted), Test Pressing Red #FF4D3D (errors only). Tagline: "unreleased. first." Say "available offline in Vinyl", never "downloaded".

## Personas
- **Free listener:** browses, plays free tracks, saves 3 offline, requests to join discovered rooms (pending approval), joins by invite link instantly.
- **Premium listener:** all of the above, plus premium tracks, 50 offline saves (editable), instant discovery joins, creates rooms.
- **Admin:** uploads tracks (with source/rights note), approves payments, edits settings, sets up the webhook.

## Rooms
Every room has an invite code (12 characters, never shown in discovery). Invite link = instant join for everyone. Discovery join: free = pending until creator/admin approves, premium = instant (setting `rooms.free_join_requires_approval`). Global discovery toggle + per-room "discoverable"; private rooms never listed. Creator can add tracks, regenerate the code, approve/reject, remove members. A rejected user waits `rooms.rejection_cooldown_days` (default 7).

## Offline
Per-track toggle stores the whole audio file in the browser cache (never a link). Caps: free 3, premium 50 (settings). Counts enforced on the server. On app open, missing files are shown as not saved. Unsaved tracks stream normally; the service worker never touches audio.

## Premium and payment
One plan, price/bank details/instructions from settings. User uploads a payment screenshot; status becomes `pending`; only an admin can activate (server function). A signed message is sent to a Google Apps Script web app that emails the admin.

## Admin scope
Approve/reject payments (with proof preview), upload tracks (file only, source required), edit settings (audit-logged; protected settings are read-only), webhook test ping, copyable Apps Script.

## Out of scope for now
Push notifications, queue drawer, artwork, ads, watermarking, room chat, analytics, admin two-step login.
