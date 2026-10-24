# 03 — Database

## Supabase Project

- **URL:** `https://<project-ref>.supabase.co` (from `.env:1`)
- **Client:** `src/lib/supabase.ts:6-11` — `createClient` with `persistSession: true`, `autoRefreshToken: true`
- **Auth model:** Email/password, no confirmation, no social providers

## Migration Files

40 migration files in `supabase/migrations/`. Listed in chronological order with key changes:

| # | File | Key contents |
|---|---|---|
| 001 | `001_profiles_auth.sql` | `profiles` table, `handle_new_user()` trigger, `is_admin()` function, RLS on profiles |
| 002 | `002_rooms_music.sql` | `rooms`, `tracks`, `room_members`, `track_plays` tables; `vinyl-audio`, `vinyl-covers`, `vinyl-avatars` buckets |
| 003 | `003_polls_games_jam.sql` | `polls`, `poll_options`, `poll_votes`, `game_sessions`, `game_questions`, `game_plays`, `game_session_answers`, `game_session_scores`, `jam_sessions`, `jam_participants` tables |
| 004 | `004_admin_ads_premium.sql` | `ads`, `ad_impressions`, `premium_features`, `user_subscriptions`, `payment_details`, `app_settings`, `activity_logs` tables |
| 005 | `005_fix_function_grants.sql` | Function grant fixes |
| 006 | `006_notifications_room_chat.sql` | `notifications`, `room_messages` tables |
| 007 | `007_add_anagram_game_type.sql` | Add `anagram` to game_type enum |
| 008 | `008_chat_media_and_fixes.sql` | `vinyl-chat` bucket, `room_messages` media columns |
| 009 | `009_admin_password_and_live_publish.sql` | `admin_password` column (plaintext default `'admin123'`) |
| 010 | `010_add_profiles_foreign_keys.sql.sql` | Foreign key fixes on profiles |
| 011 | `011_create_admin_account.sql` | Create admin auth user |
| 012 | `012_fix_admin_auth_identity.sql` | Fix admin auth identity |
| 013 | `013_password_only_admin_access.sql` | Switch admin to password-only (no login required) |
| 014 | `014_cleanup_broken_admin_account.sql` | Remove broken admin auth user |
| 015 | `015_admin_expansion.sql` | 40+ admin RPC functions |
| 016 | `016_premium_feature_management.sql.sql` | Premium feature management functions |
| 017 | `017_drop_duplicate_premium_feature_fn.sql.sql` | Drop duplicate function |
| 018 | `018_premium_pricing_webhook_columns.sql` | Pricing columns, `payment_webhook_url`, `premium_currency` |
| 019 | `019_admin_pricing_webhook_rpcs.sql` | Admin pricing/webhook RPCs |
| 020 | `020_fix_admin_rpc_grants.sql` | Admin RPC grant fixes |
| 1a | `1a_fix_admin_credentials.sql.sql` | Replace plaintext password with `crypt()` hash, `verify_admin_password()`, `admin_change_password()` |
| 1a(crypt) | `1a_fix_crypt_schema.sql.sql` | Fix crypt schema |
| 1b | `1b_fix_function_grants.sql.sql` | Function grant fixes |
| 1b(anon) | `1b_fix_remaining_anon_grants.sql.sql` | Revoke remaining anon grants |
| 1b(pub) | `1b_revoke_public_execute.sql.sql` | Revoke public execute |
| 1c | `1c_fix_subscription_self_approval.sql.sql` | Fix subscription self-approval vulnerability |
| 1d | `1d_fix_room_members_insert.sql.sql` | Fix room_members insert |
| 1d(grants) | `1d_fix_public_grants.sql.sql` | Fix public grants |
| 1d(revoke) | `1d_revoke_anon_explicit.sql.sql` | Revoke anon explicitly |
| 2a | `2a_room_discovery_join_invite.sql.sql` | Room discovery, `join_room()`, `redeem_invite()`, `approve_join_request()`, `reject_join_request()`, invitations table, `create_room()` |
| 3a | `3a_secure_audio_bucket.sql.sql` | Secure audio bucket |
| 4b | `4b_grant_cleanup.sql.sql` | Grant cleanup |
| 4c | `4c_room_offline_limits.sql.sql` | Offline limits, `create_room()` with room limits |
| 5a | `5a_sort_order_and_webhook_revoke.sql.sql` | Sort order, webhook revoke |
| 5b | `5b_update_premium_features_rpc.sql.sql` | Update premium features RPC |
| 6a | `6a_fix_storage_security.sql.sql` | Storage security fixes for all 5 buckets |
| 6b | `6b_fix_app_settings_grant.sql.sql` | Fix app_settings grant |
| 6c | `6c_protect_admin_hash_column.sql.sql` | Protect admin_password_hash column |
| 6d | `6d_revert_table_grant_keep_column_grants.sql.sql` | Revert table grant, keep column grants |
| 7a | `7a_restore_anon_admin_rpc_grants.sql.sql` | Restore anon admin RPC grants |

## Tables (28+)

### Core tables

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `profiles` | `001:6` | `id (uuid, PK)`, `display_name (text)`, `avatar_url (text)`, `is_admin (bool, default false)`, `created_at (timestamptz)` | Enabled |
| `rooms` | `002:6` | `id (uuid)`, `name (text)`, `description (text)`, `owner_id (uuid FK profiles)`, `visibility (enum public/private)`, `join_policy (enum open/request)`, `theme_color (text default #4D7CFE)`, `passphrase (text)`, `discoverable (bool)`, `invite_code (text)`, `cover_url (text)`, `created_at` | Enabled |
| `tracks` | `002:66` | `id (uuid)`, `room_id (uuid FK rooms)`, `uploaded_by (uuid FK profiles)`, `title (text)`, `file_path (text)`, `duration_seconds (int)`, `cover_url (text)`, `sort_order (int)`, `created_at` | Enabled |
| `room_members` | `002:115` | `id (uuid)`, `room_id (uuid FK)`, `user_id (uuid FK)`, `role (enum member/admin/owner)`, `status (enum active/pending/banned)`, `created_at` | Enabled |
| `track_plays` | `002:145` | `id (uuid)`, `track_id (uuid FK)`, `room_id (uuid FK)`, `user_id (uuid FK)`, `played_at (timestamptz)` | Enabled |
| `listening_events` | (in 006 or later) | `id`, `room_id`, `track_id`, `user_id`, `listened_seconds (int)` | Enabled |

### Polls & Games

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `polls` | `003:6` | `id`, `room_id`, `created_by`, `question (text)`, `type (enum poll/survey)`, `multiple_choice (bool)`, `closes_at (timestamptz)`, `created_at` | Enabled |
| `poll_options` | `003:44` | `id`, `poll_id`, `text (text)`, `position (int)` | Enabled |
| `poll_votes` | `003:70` | `id`, `poll_id`, `option_id`, `user_id`, `created_at` | Enabled |
| `game_sessions` | `003:100` | `id`, `room_id`, `created_by`, `game_type (enum)`, `title`, `duration_seconds (int)`, `status (enum waiting/active/completed)`, `play_requirement (int)`, `repeat_questions (bool)`, `is_permanent (bool)` | Enabled |
| `game_questions` | `003:140` | `id`, `session_id`, `question (text)`, `correct_answer (text)`, `choices (text[])`, `image_urls (text[])`, `question_type (enum)`, `position (int)` | Enabled |
| `game_plays` | `003:180` | `id`, `game_id`, `room_id`, `user_id`, `status (enum)`, `started_at`, `completed_at`, `total_points`, `correct_count`, `avg_time_ms` | Enabled |
| `game_session_answers` | `003:220` | `id`, `session_id`, `question_id`, `user_id`, `answer (text)`, `time_ms (int)`, `is_correct (bool)`, `points (int)` | Enabled |
| `game_session_scores` | `003:260` | `id`, `session_id`, `room_id`, `user_id`, `total_points (int)`, `correct_count (int)`, `avg_time_ms (int)` | Enabled |

### Jam Sessions

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `jam_sessions` | `003:300` | `id`, `room_id`, `host_id`, `status (enum active/ended)`, `current_track_id`, `started_at`, `ended_at` | Enabled |
| `jam_participants` | `003:340` | `id`, `jam_id`, `user_id`, `joined_at` | Enabled |

### Notifications & Chat

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `notifications` | `006:6` | `id`, `user_id`, `type (text)`, `message (text)`, `room_id (uuid)`, `is_read (bool)`, `created_at` | Enabled |
| `room_messages` | `006:66` | `id`, `room_id`, `user_id`, `text (text)`, `shared_track_id (uuid)`, `reply_to (uuid)`, `media_url (text)`, `media_type (text)`, `gif_url (text)`, `created_at` | Enabled |

### Admin / Premium / Ads

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `ads` | `004:6` | `id`, `title (text)`, `content (text)`, `image_url (text)`, `placement (text)`, `is_active (bool)`, `impressions (int)`, `clicks (int)`, `created_at` | Enabled |
| `ad_impressions` | `004:50` | `id`, `ad_id`, `user_id`, `impressed_at (timestamptz)` | Enabled |
| `premium_features` | `004:80` | `id`, `feature (text)`, `label (text)`, `description (text)`, `is_premium (bool)`, `created_at` | Enabled |
| `user_subscriptions` | `004:120` | `id`, `user_id`, `payment_ref (text)`, `payment_amount (numeric)`, `receipt_path (text)`, `receipt_status (enum pending/approved/rejected)`, `status (enum pending/active/expired)`, `webhook_status (text)`, `created_at`, `approved_at`, `expires_at` | Enabled |
| `payment_details` | `004:170` | `id`, `bank_name (text)`, `account_name (text)`, `account_number (text)`, `routing_number (text)`, `instructions (text)`, `is_active (bool)`, `custom_heading (text)`, `custom_subtext (text)`, `footer_note (text)` | Enabled |
| `app_settings` | `004:210` | `id (int, PK=1)`, `admin_password_hash (text)`, `max_rooms_free (int default 3)`, `max_rooms_premium (int default 20)`, `discovery_enabled (bool default true)`, `premium_popup_copy (jsonb)`, `payment_webhook_url (text)`, `premium_currency (text default NGN)`, `premium_price_yearly (numeric)`, `premium_price_monthly (numeric)` | Enabled |
| `activity_logs` | `004:260` | `id`, `user_id`, `action_type (text)`, `description (text)`, `created_at` | Enabled |

### Invitations

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `invitations` | `2a:6` | `id`, `room_id`, `created_by`, `token (text)`, `used (bool)`, `expires_at (timestamptz)`, `created_at` | Enabled |

### Comments (schema drift — table exists but NOT used by client)

| Table | Created | Key columns | RLS |
|---|---|---|---|
| `comments` | `002:170` | `id`, `track_id`, `user_id`, `text (text)`, `parent_id (uuid)`, `created_at` | Enabled |

**IMPORTANT:** The `comments` table exists in the database (created in migration 002) but is **never referenced by any client code**. Grep for `.from('comments')` in `src/` returns zero matches. This is schema drift — the table was created but the feature was never built or was removed.

## Storage Buckets

| Bucket | Public | Created | Policies (after `6a`) |
|---|---|---|---|
| `vinyl-audio` | No | `002:57` | SELECT/INSERT/DELETE: authenticated (owner check on DELETE) |
| `vinyl-covers` | Yes | `002:61` | SELECT: public; INSERT/DELETE: authenticated (owner check) |
| `vinyl-avatars` | Yes | `002:65` | SELECT: public; INSERT/DELETE: authenticated (owner check) |
| `vinyl-chat` | Yes | `008:28` | SELECT/INSERT/DELETE: authenticated (owner check) |
| `vinyl-receipts` | No | `6a:81` | SELECT/INSERT/DELETE: authenticated + owner only |

## RPC Functions (60+)

### Public/User RPCs

| Function | File:line | Args | Returns | Purpose |
|---|---|---|---|---|
| `create_room` | `4c:6` | `p_name, p_description, p_visibility, p_join_policy, p_theme_color, p_passphrase, p_discoverable` | `{ id }` | Create room with limit check |
| `join_room` | `2a:50` | `p_room_id, p_passphrase` | `{ status, message }` | Join room or submit request |
| `redeem_invite` | `2a:120` | `p_token` | `{ success, p_room_id }` | Redeem single-use invite |
| `approve_join_request` | `2a:160` | `p_member_id` | `{ success, message }` | Admin approves pending member |
| `reject_join_request` | `2a:190` | `p_member_id` | `{ success, message }` | Admin rejects pending member |
| `start_jam` | `003:380` | `p_room_id` | `uuid` | Start jam session |
| `end_jam` | `003:420` | `p_jam_id` | void | End jam session |
| `expire_subscriptions` | `004:300` | none | void | Mark expired subscriptions |
| `get_entitlements` | `1d:6` | `p_user_id` | `text` | Get user's tier (`premium`/`free`) |
| `public_get_webhook_url` | `019:6` | none | `text` | Get payment webhook URL |
| `verify_admin_password` | `1a:43` | `p_password` | `bool` | Verify admin password against hash |

### Admin RPCs (all accept `p_password` as first arg)

| Function | Purpose |
|---|---|
| `admin_get_overview` | Dashboard overview stats |
| `admin_get_users_enhanced` | User list with filters |
| `admin_get_rooms_enhanced` | Room list with filters |
| `admin_get_subscriptions_enhanced` | Subscription list |
| `admin_approve_subscription` | Approve pending subscription |
| `admin_reject_subscription` | Reject pending subscription |
| `admin_grant_premium` | Manually grant premium to user |
| `admin_revoke_premium` | Revoke premium from user |
| `admin_toggle_ad` | Toggle ad active status |
| `admin_create_ad` | Create new ad |
| `admin_update_ad` | Update ad |
| `admin_delete_ad` | Delete ad |
| `admin_send_announcement` | Send announcement notification |
| `admin_save_settings` | Save app settings |
| `admin_save_premium_pricing` | Save premium pricing |
| `admin_save_payment_details` | Save/add payment details |
| `admin_get_all_payment_details` | Get all payment methods |
| `admin_update_premium_feature` | Update premium feature |
| `admin_add_premium_feature` | Add premium feature |
| `admin_delete_premium_feature` | Delete premium feature |
| `admin_change_password` | Change admin password |
| `admin_get_analytics` | Get analytics data |
| `admin_get_activity_logs` | Get activity logs with pagination |
| `admin_export_data` | Export table data as JSON |
| `admin_bug_check` | Data integrity check |
| `admin_fix_bug` | Fix specific data issue |
| `admin_get_settings` | Get settings + payment details |

## RLS Summary

**RLS is enabled on ALL tables.** Every table has at minimum SELECT policies for authenticated users. Key patterns:

- **User-owned data** (profiles, tracks, room_members, etc.): `auth.uid() = user_id` or `auth.uid() = owner_id`
- **Room-scoped data** (tracks, polls, games, chat, etc.): Accessible to room members via join check
- **Admin-only writes** (ads, premium_features, payment_details, app_settings, activity_logs): Gated by `is_admin()` function checking `profiles.is_admin`
- **Public reads** (rooms with `visibility = 'public'` and `discoverable = true`): `USING (true)` for SELECT

## Schema Drift

| Issue | Details |
|---|---|
| `comments` table | Created in `002:170` but **never queried by client code**. Zero matches for `.from('comments')` in `src/`. The comments feature appears to have been planned but never implemented (or removed). |
| `ads` / `ad_impressions` | Tables exist and have admin RPCs, but **no client-side ad display component exists**. The admin can create/manage ads, but they are never shown to users. |
| `activity_logs` | Only written by admin RPC functions. No client code inserts into activity_logs directly. |
| `jam_participants` | The `JamBanner` component queries jam_sessions and counts participants, but never inserts into `jam_participants`. The `start_jam` RPC may handle this server-side. |
