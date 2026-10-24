# 03 — Database

## Supabase Project
- **URL:** from `.env:1`
- **Client:** `src/lib/supabase.ts:6-11` — `persistSession: true`, `autoRefreshToken: true`
- **Auth:** Email/password, no confirmation, no social providers

## Migrations (40 files in `supabase/migrations/`)

| # | File | Key contents |
|---|---|---|
| 001 | `001_profiles_auth.sql` | `profiles` table, `handle_new_user()` trigger, `is_admin()` function |
| 002 | `002_rooms_music.sql` | `rooms`, `tracks`, `room_members`, `track_plays`, `comments`; `vinyl-audio`, `vinyl-covers`, `vinyl-avatars` buckets |
| 003 | `003_polls_games_jam.sql` | `polls`, `poll_options`, `poll_votes`, `game_sessions`, `game_questions`, `game_plays`, `game_session_answers`, `game_session_scores`, `jam_sessions`, `jam_participants` |
| 004 | `004_admin_ads_premium.sql` | `ads`, `ad_impressions`, `premium_features`, `user_subscriptions`, `payment_details`, `app_settings`, `activity_logs` |
| 005 | `005_fix_function_grants.sql` | Function grant fixes |
| 006 | `006_notifications_room_chat.sql` | `notifications`, `room_messages` tables |
| 007 | `007_add_anagram_game_type.sql` | Add `anagram` to game_type enum |
| 008 | `008_chat_media_and_fixes.sql` | `vinyl-chat` bucket, media columns on room_messages |
| 009 | `009_admin_password_and_live_publish.sql` | `admin_password` column (plaintext default `'admin123'`) |
| 010-014 | Various | Admin account creation/cleanup, password-only admin access |
| 015 | `015_admin_expansion.sql` | 40+ admin RPC functions |
| 016-020 | Various | Premium feature management, pricing/webhook columns, admin RPCs |
| 1a | `1a_fix_admin_credentials.sql.sql` | Replace plaintext password with `crypt()` hash, `verify_admin_password()` |
| 1b-1d | Various | Function grant fixes, subscription self-approval fix, room_members insert fix |
| 2a | `2a_room_discovery_join_invite.sql.sql` | Room discovery, `join_room()`, `redeem_invite()`, invitations table |
| 3a-4c | Various | Secure audio bucket, room offline limits |
| 5a-5b | Various | Sort order, webhook revoke, premium features RPC |
| 6a-6d | Various | Storage security fixes, protect admin hash column |
| 7a | `7a_restore_anon_admin_rpc_grants.sql.sql` | Restore anon admin RPC grants |

## Tables (28+)

### Core
| Table | Created | Key columns | RLS |
|---|---|---|---|
| `profiles` | `001:6` | `id (uuid PK)`, `display_name`, `avatar_url`, `is_admin (bool default false)`, `created_at` | Enabled |
| `rooms` | `002:6` | `id`, `name`, `description`, `owner_id FK profiles`, `visibility (enum public/private)`, `join_policy (enum open/request)`, `theme_color`, `passphrase`, `discoverable`, `invite_code`, `cover_url` | Enabled |
| `tracks` | `002:66` | `id`, `room_id FK rooms`, `uploaded_by FK profiles`, `title`, `file_path`, `duration_seconds`, `cover_url`, `sort_order` | Enabled |
| `room_members` | `002:115` | `id`, `room_id FK`, `user_id FK`, `role (enum member/admin/owner)`, `status (enum active/pending/banned)` | Enabled |
| `track_plays` | `002:145` | `id`, `track_id FK`, `room_id FK`, `user_id FK`, `played_at` | Enabled |
| `listening_events` | (006+) | `id`, `room_id`, `track_id`, `user_id`, `listened_seconds (int)` | Enabled |

### Polls & Games
| Table | Created | Key columns |
|---|---|---|
| `polls` | `003:6` | `id`, `room_id`, `created_by`, `question`, `type (enum poll/survey)`, `multiple_choice`, `closes_at` |
| `poll_options` | `003:44` | `id`, `poll_id`, `text`, `position` |
| `poll_votes` | `003:70` | `id`, `poll_id`, `option_id`, `user_id` |
| `game_sessions` | `003:100` | `id`, `room_id`, `created_by`, `game_type (enum)`, `title`, `duration_seconds`, `status (enum waiting/active/completed)`, `play_requirement`, `repeat_questions`, `is_permanent` |
| `game_questions` | `003:140` | `id`, `session_id`, `question`, `correct_answer`, `choices (text[])`, `image_urls (text[])`, `question_type`, `position` |
| `game_plays` | `003:180` | `id`, `game_id`, `room_id`, `user_id`, `status`, `started_at`, `completed_at`, `total_points`, `correct_count`, `avg_time_ms` |
| `game_session_answers` | `003:220` | `id`, `session_id`, `question_id`, `user_id`, `answer`, `time_ms`, `is_correct`, `points` |
| `game_session_scores` | `003:260` | `id`, `session_id`, `room_id`, `user_id`, `total_points`, `correct_count`, `avg_time_ms` |
| `jam_sessions` | `003:300` | `id`, `room_id`, `host_id`, `status (enum active/ended)`, `current_track_id`, `started_at`, `ended_at` |
| `jam_participants` | `003:340` | `id`, `jam_id`, `user_id`, `joined_at` |

### Notifications & Chat
| Table | Created | Key columns |
|---|---|---|
| `notifications` | `006:6` | `id`, `user_id`, `type`, `message`, `room_id`, `is_read`, `created_at` |
| `room_messages` | `006:66` | `id`, `room_id`, `user_id`, `text`, `shared_track_id`, `reply_to`, `media_url`, `media_type`, `gif_url`, `created_at` |

### Admin / Premium / Ads
| Table | Created | Key columns |
|---|---|---|
| `ads` | `004:6` | `id`, `title`, `content`, `image_url`, `placement`, `is_active`, `impressions`, `clicks` |
| `ad_impressions` | `004:50` | `id`, `ad_id`, `user_id`, `impressed_at` |
| `premium_features` | `004:80` | `id`, `feature`, `label`, `description`, `is_premium` |
| `user_subscriptions` | `004:120` | `id`, `user_id`, `payment_ref`, `payment_amount (numeric)`, `receipt_path`, `receipt_status (enum pending/approved/rejected)`, `status (enum pending/active/expired)`, `webhook_status`, `created_at`, `approved_at`, `expires_at` |
| `payment_details` | `004:170` | `id`, `bank_name`, `account_name`, `account_number`, `routing_number`, `instructions`, `is_active`, `custom_heading`, `custom_subtext`, `footer_note` |
| `app_settings` | `004:210` | `id (int PK=1)`, `admin_password_hash`, `max_rooms_free (default 3)`, `max_rooms_premium (default 20)`, `discovery_enabled`, `premium_popup_copy (jsonb)`, `payment_webhook_url`, `premium_currency (default NGN)`, `premium_price_yearly`, `premium_price_monthly` |
| `activity_logs` | `004:260` | `id`, `user_id`, `action_type`, `description`, `created_at` |
| `invitations` | `2a:6` | `id`, `room_id`, `created_by`, `token`, `used`, `expires_at` |

## Storage Buckets

| Bucket | Public | Created | Policies (after `6a`) |
|---|---|---|---|
| `vinyl-audio` | No | `002:57` | SELECT/INSERT/DELETE: authenticated (owner check on DELETE) |
| `vinyl-covers` | Yes | `002:61` | SELECT: public; INSERT/DELETE: authenticated (owner) |
| `vinyl-avatars` | Yes | `002:65` | SELECT: public; INSERT/DELETE: authenticated (owner) |
| `vinyl-chat` | Yes | `008:28` | SELECT/INSERT/DELETE: authenticated (owner) |
| `vinyl-receipts` | No | `6a:81` | SELECT/INSERT/DELETE: authenticated + owner only |

## RPC Functions (60+)

### User-facing
| Function | Purpose |
|---|---|
| `create_room` | Create room with limit check |
| `join_room` | Join room or submit request |
| `redeem_invite` | Redeem single-use invite |
| `approve_join_request` / `reject_join_request` | Admin approve/reject pending member |
| `start_jam` / `end_jam` | Start/end jam session |
| `get_entitlements` | Get user's tier (`premium`/`free`) |
| `public_get_webhook_url` | Get payment webhook URL |
| `verify_admin_password` | Verify admin password against hash |

### Admin (all accept `p_password` first)
`admin_get_overview`, `admin_get_users_enhanced`, `admin_get_rooms_enhanced`, `admin_get_subscriptions_enhanced`, `admin_approve_subscription`, `admin_reject_subscription`, `admin_grant_premium`, `admin_revoke_premium`, `admin_toggle_ad`, `admin_create_ad`, `admin_update_ad`, `admin_delete_ad`, `admin_send_announcement`, `admin_save_settings`, `admin_save_premium_pricing`, `admin_save_payment_details`, `admin_get_all_payment_details`, `admin_update_premium_feature`, `admin_add_premium_feature`, `admin_delete_premium_feature`, `admin_change_password`, `admin_get_analytics`, `admin_get_activity_logs`, `admin_export_data`, `admin_bug_check`, `admin_fix_bug`, `admin_get_settings`

## RLS Summary
RLS enabled on ALL tables. Patterns:
- **User-owned:** `auth.uid() = user_id` or `auth.uid() = owner_id`
- **Room-scoped:** Accessible to room members via join check
- **Admin-only writes:** Gated by `is_admin()` function
- **Public reads:** `USING (true)` for public rooms with `discoverable = true`

## Schema Drift
| Issue | Details |
|---|---|
| `comments` table | Created in `002:170` but **never queried by client code** (zero `.from('comments')` matches in `src/`) |
| `ads` / `ad_impressions` | Admin can create/manage but **no client component renders ads to users** |
| `activity_logs` | Only written by admin RPCs, never by client code directly |
