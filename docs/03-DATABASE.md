# 03 — Database Schema

Complete schema derived from all 40 migration files in `supabase/migrations/`.

## 3a — TABLES

### profiles
Migration: `001_profiles_auth.sql:42-48`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | — (PK) |
| display_name | text | YES | `''` |
| avatar_url | text | YES | — |
| is_admin | boolean | NO | `false` |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `id` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;` (`001:50`)

### rooms
Migration: `002_rooms_music.sql:108-120`, columns added later.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| name | text | NO | — |
| description | text | YES | `''` |
| owner_id | uuid | NO | `auth.uid()` |
| cover_url | text | YES | — |
| visibility | text | NO | `'public'` (CHECK: `'public'`, `'private'`) |
| join_policy | text | NO | `'open'` (CHECK: `'open'`, `'request'`) |
| invite_code | text | NO | `upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))` (UNIQUE) |
| theme_color | text | YES | `'#6366f1'` |
| passphrase | text | YES | — |
| discoverable | boolean | NO | `false` (added in `1d_fix_room_members_insert.sql:34`) |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `owner_id` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;` (`002:121`)
- Indexes: `idx_rooms_owner` on `owner_id` (`002:437`)

### room_members
Migration: `002_rooms_music.sql:126-135`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| role | text | NO | `'member'` (CHECK: `'owner'`, `'admin'`, `'member'`) |
| status | text | NO | `'active'` (CHECK: `'active'`, `'pending'`, `'banned'`) |
| created_at | timestamptz | NO | `now()` |
| nda_accepted_at | timestamptz | YES | — |

- PK: `id`
- FK: `room_id` → `rooms(id) ON DELETE CASCADE`, `user_id` → `auth.users(id) ON DELETE CASCADE`
- UNIQUE: `(room_id, user_id)`
- RLS: `ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;` (`002:136`)
- Indexes: `idx_room_members_room` on `room_id`, `idx_room_members_user` on `user_id` (`002:438-439`)

### tracks
Migration: `002_rooms_music.sql:227-236`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| uploaded_by | uuid | NO | `auth.uid()` |
| title | text | NO | — |
| file_path | text | NO | — |
| duration_seconds | integer | YES | `0` |
| cover_url | text | YES | — |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `room_id` → `rooms(id) ON DELETE CASCADE`, `uploaded_by` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;` (`002:237`)
- Indexes: `idx_tracks_room` on `room_id` (`002:440`)

### comments
Migration: `002_rooms_music.sql:283-294`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| track_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| text | text | YES | `''` |
| timestamp_seconds | integer | YES | — |
| parent_id | uuid | YES | — (self-ref FK, cascade) |
| gif_url | text | YES | — |
| sticker_id | text | YES | — |
| comment_media | text | YES | — |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `track_id` → `tracks(id) ON DELETE CASCADE`, `user_id` → `auth.users(id) ON DELETE CASCADE`, `parent_id` → `comments(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE comments ENABLE ROW LEVEL SECURITY;` (`002:295`)
- Indexes: `idx_comments_track` on `track_id`, `idx_comments_parent` on `parent_id` (`002:441-442`)

### invitations
Migration: `002_rooms_music.sql:344-352`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| created_by | uuid | NO | `auth.uid()` |
| token | text | NO | `encode(gen_random_bytes(16), 'hex')` (UNIQUE) |
| used | boolean | NO | `false` |
| expires_at | timestamptz | YES | — |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `room_id` → `rooms(id) ON DELETE CASCADE`, `created_by` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;` (`002:353`)
- Indexes: `idx_invitations_room` on `room_id` (`002:443`)

### track_plays
Migration: `002_rooms_music.sql:386-392`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| track_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| played_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: `room_id` → `rooms(id) ON DELETE CASCADE`, `track_id` → `tracks(id) ON DELETE CASCADE`, `user_id` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE track_plays ENABLE ROW LEVEL SECURITY;` (`002:393`)
- Indexes: `idx_track_plays_room` on `room_id` (`002:444`)

### listening_events
Migration: `002_rooms_music.sql:411-418`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| track_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| listened_seconds | integer | YES | `0` |
| created_at | timestamptz | NO | `now()` |

- PK: `id`
- FK: same pattern as track_plays
- RLS: `ALTER TABLE listening_events ENABLE ROW LEVEL SECURITY;` (`002:419`)
- Indexes: `idx_listening_events_user` on `user_id` (`002:445`)

### polls
Migration: `003_polls_games_jam.sql:25-34`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| created_by | uuid | NO | `auth.uid()` |
| question | text | NO | — |
| type | text | YES | `'poll'` (CHECK: `'poll'`, `'survey'`) |
| multiple_choice | boolean | NO | `false` |
| closes_at | timestamptz | YES | — |
| created_at | timestamptz | NO | `now()` |

- PK: `id`, FK: `room_id` → `rooms(id)`, `created_by` → `auth.users(id)`
- RLS: `ALTER TABLE polls ENABLE ROW LEVEL SECURITY;` (`003:35`)
- Index: `idx_polls_room` on `room_id` (`003:439`)

### poll_options
Migration: `003_polls_games_jam.sql:58-64`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| poll_id | uuid | NO | — |
| text | text | NO | — |
| position | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |

- FK: `poll_id` → `polls(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;` (`003:65`)
- Index: `idx_poll_options_poll` on `poll_id` (`003:440`)

### poll_votes
Migration: `003_polls_games_jam.sql:87-93`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| poll_id | uuid | NO | — |
| option_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| created_at | timestamptz | NO | `now()` |

- FK: `poll_id` → `polls(id)`, `option_id` → `poll_options(id)`, `user_id` → `auth.users(id)`
- RLS: `ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;` (`003:94`)
- Indexes: `idx_poll_votes_poll`, `idx_poll_votes_user` (`003:441-442`)

### game_sessions
Migration: `003_polls_games_jam.sql:116-132`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| created_by | uuid | NO | `auth.uid()` |
| game_type | text | NO | `'mixed'` (CHECK: `'complete_line'`, `'timer_question'`, `'four_pics'`, `'mixed'`) |
| status | text | NO | `'waiting'` (CHECK: `'waiting'`, `'active'`, `'ended'`) |
| duration_seconds | integer | YES | `60` |
| started_at | timestamptz | YES | — |
| ends_at | timestamptz | YES | — |
| ended_at | timestamptz | YES | — |
| winner_id | uuid | YES | — |
| repeat_questions | boolean | NO | `false` |
| is_permanent | boolean | NO | `false` |
| title | text | YES | `''` |
| play_requirement | integer | YES | `1` |
| created_at | timestamptz | NO | `now()` |

- Note: `game_type` CHECK constraint does NOT include `'anagram'` in the original migration, but migration `007_add_anagram_game_type.sql` adds it (confirmed by the TS type including `'anagram'` in `src/types/index.ts:105`).
- RLS: `ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;` (`003:133`)
- Index: `idx_game_sessions_room` (`003:443`)

### game_questions
Migration: `003_polls_games_jam.sql:156-166`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| session_id | uuid | NO | — |
| question | text | NO | — |
| correct_answer | text | NO | — |
| choices | jsonb | NO | `'[]'::jsonb` |
| image_urls | jsonb | NO | `'[]'::jsonb` |
| question_type | text | YES | `'text'` |
| position | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;` (`003:167`)

### game_plays
Migration: `003_polls_games_jam.sql:189-203`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| game_id | uuid | NO | — |
| room_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| status | text | NO | `'in_progress'` (CHECK: `'in_progress'`, `'completed'`) |
| started_at | timestamptz | NO | `now()` |
| ends_at | timestamptz | YES | — |
| completed_at | timestamptz | YES | — |
| total_points | integer | NO | `0` |
| correct_count | integer | NO | `0` |
| avg_time_ms | integer | NO | `0` |
| play_date | date | NO | `CURRENT_DATE` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;` (`003:204`)

### game_session_answers
Migration: `003_polls_games_jam.sql:226-236`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| session_id | uuid | NO | — |
| question_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| answer | text | NO | `''` |
| time_ms | integer | NO | `0` |
| is_correct | boolean | NO | `false` |
| points | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE game_session_answers ENABLE ROW LEVEL SECURITY;` (`003:237`)

### game_session_scores
Migration: `003_polls_games_jam.sql:259-269`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| session_id | uuid | NO | — |
| room_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| total_points | integer | NO | `0` |
| correct_count | integer | NO | `0` |
| avg_time_ms | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |

- UNIQUE: `(session_id, user_id)`
- RLS: `ALTER TABLE game_session_scores ENABLE ROW LEVEL SECURITY;` (`003:271`)

### jam_sessions
Migration: `003_polls_games_jam.sql:292-303`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| host_id | uuid | NO | `auth.uid()` |
| status | text | NO | `'active'` (CHECK: `'active'`, `'ended'`) |
| current_track_id | uuid | YES | — |
| position_seconds | numeric | NO | `0` |
| is_playing | boolean | NO | `false` |
| queue_track_ids | jsonb | NO | `'[]'::jsonb` |
| started_at | timestamptz | NO | `now()` |
| ended_at | timestamptz | YES | — |

- RLS: `ALTER TABLE jam_sessions ENABLE ROW LEVEL SECURITY;` (`003:304`)

### jam_participants
Migration: `003_polls_games_jam.sql:327-334`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| jam_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| joined_at | timestamptz | NO | `now()` |
| last_seen_at | timestamptz | NO | `now()` |

- UNIQUE: `(jam_id, user_id)`
- RLS: `ALTER TABLE jam_participants ENABLE ROW LEVEL SECURITY;` (`003:335`)

### ads
Migration: `004_admin_ads_premium.sql:58-77`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| title | text | NO | `''` |
| description | text | YES | — |
| video_path | text | YES | — |
| video_url | text | YES | — |
| status | text | NO | `'draft'` (CHECK: `'draft'`, `'active'`, `'paused'`, `'expired'`) |
| trigger_type | text | YES | `'on_any_page'` |
| trigger_types | jsonb | NO | `'[]'::jsonb` |
| trigger_config | jsonb | NO | `'{}'::jsonb` |
| starts_at | timestamptz | YES | — |
| ends_at | timestamptz | YES | — |
| show_to_premium | boolean | NO | `false` |
| cta_url | text | YES | — |
| cta_label | text | YES | `'Learn More'` |
| close_after_seconds | integer | YES | `5` |
| skip_duration_seconds | integer | YES | `5` |
| impressions | integer | NO | `0` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE ads ENABLE ROW LEVEL SECURITY;` (`004:78`)

### ad_impressions
Migration: `004_admin_ads_premium.sql:102-108`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| ad_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| room_id | uuid | YES | — |
| shown_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;` (`004:109`)

### premium_features
Migration: `004_admin_ads_premium.sql:123-128`, column added in `5a_sort_order.sql:19`

| Column | Type | Nullable | Default |
|---|---|---|---|
| feature | text | NO | — (PK) |
| is_premium | boolean | NO | `true` |
| label | text | NO | `''` |
| description | text | YES | — |
| sort_order | integer | NO | `0` (added `5a:19`) |

- PK: `feature`
- RLS: `ALTER TABLE premium_features ENABLE ROW LEVEL SECURITY;` (`004:129`)
- Seeded with 4 features: `mix_mode`, `offline_access`, `game_access`, `chat_attachments` (`004:151-156`)

### user_subscriptions
Migration: `004_admin_ads_premium.sql:161-172`, column added in `018:29-30`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| user_id | uuid | NO | `auth.uid()` |
| status | text | NO | `'pending'` (CHECK: `'active'`, `'expired'`, `'cancelled'`, `'pending'`) |
| payment_ref | text | YES | `''` |
| payment_amount | numeric | YES | `0` |
| receipt_path | text | YES | — |
| receipt_status | text | NO | `'pending'` (CHECK: `'pending'`, `'approved'`, `'rejected'`) |
| granted_at | timestamptz | YES | — |
| expires_at | timestamptz | YES | — |
| created_at | timestamptz | NO | `now()` |
| webhook_status | text | YES | — (added `018:30`) |

- RLS: `ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;` (`004:173`)

### payment_details
Migration: `004_admin_ads_premium.sql:192-203`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| bank_name | text | NO | `''` |
| account_name | text | NO | `''` |
| account_number | text | NO | `''` |
| routing_number | text | YES | — |
| instructions | text | YES | — |
| is_active | boolean | NO | `true` |
| custom_heading | text | YES | `'Upgrade to Premium'` |
| custom_subtext | text | YES | `'Subscribe to unlock all premium features'` |
| footer_note | text | YES | `''` |

- RLS: `ALTER TABLE payment_details ENABLE ROW LEVEL SECURITY;` (`004:204`)

### app_settings
Migration: `004_admin_ads_premium.sql:228-233`, columns added in `009:44`, `018:24-27`, `1a:25`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | integer | NO | `1` (PK, CHECK `id = 1`) |
| max_rooms_free | integer | NO | `3` |
| max_rooms_premium | integer | NO | `20` |
| premium_popup_copy | jsonb | NO | `{"title":"Upgrade to Premium","body":"...","cta_label":"Subscribe Now"}` |
| admin_password_hash | text | YES | — (added `1a:25`, column-level REVOKE SELECT from authenticated in `6c:18`) |
| premium_price | numeric | NO | `0` (added `018:25`) |
| premium_currency | text | NO | `'NGN'` (added `018:26`) |
| payment_webhook_url | text | YES | — (added `018:27`) |
| discovery_enabled | boolean | NO | `true` (added `2a:23`) |

- PK: `id` (singleton — only row with `id = 1`)
- RLS: `ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;` (`004:234`)
- Note: `admin_password` column was added in `009:44` (plaintext default `'admin123'`), then DROPPED in `1a:71` and replaced with `admin_password_hash`.

### activity_logs
Migration: `004_admin_ads_premium.sql:253-264`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| user_id | uuid | YES | — |
| user_name | text | YES | `''` |
| action_type | text | NO | `''` |
| description | text | YES | `''` |
| entity_type | text | YES | `''` |
| entity_id | uuid | YES | — |
| room_id | uuid | YES | — |
| metadata | jsonb | NO | `'{}'::jsonb` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;` (`004:265`)

### notifications
Migration: `006_notifications_room_chat.sql:46-61`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| user_id | uuid | NO | — |
| actor_id | uuid | YES | — |
| type | text | NO | — (CHECK: 12 types — `comment_on_track`, `reply_to_comment`, `jam_started`, `poll_created`, `game_created`, `member_joined`, `join_request`, `premium_approved`, `premium_rejected`, `mention`, `chat_message`, `announcement`) |
| entity_type | text | YES | — |
| entity_id | uuid | YES | — |
| room_id | uuid | YES | — |
| message | text | NO | `''` |
| is_read | boolean | NO | `false` |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;` (`006:63`)

### room_messages
Migration: `006_notifications_room_chat.sql:138-146`, columns added in `008:22-24`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` (PK) |
| room_id | uuid | NO | — |
| user_id | uuid | NO | `auth.uid()` |
| text | text | NO | `''` |
| shared_track_id | uuid | YES | — |
| reply_to | uuid | YES | — (self-ref FK) |
| media_url | text | YES | — (added `008:22`) |
| media_type | text | YES | — (added `008:23`) |
| gif_url | text | YES | — (added `008:24`) |
| created_at | timestamptz | NO | `now()` |

- RLS: `ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;` (`006:148`)

### offline_track_limits
Migration: `4c_room_offline_limits.sql:39-43`

| Column | Type | Nullable | Default |
|---|---|---|---|
| user_id | uuid | NO | — (PK) |
| track_count | integer | NO | `0` |
| updated_at | timestamptz | NO | `now()` |

- PK: `user_id`
- FK: `user_id` → `auth.users(id) ON DELETE CASCADE`
- RLS: `ALTER TABLE offline_track_limits ENABLE ROW LEVEL SECURITY;` (`4c:45`)

---

## 3b — RLS POLICIES (summary)

Due to the volume (100+ policies across 40 migrations), here is a summary of the final policy state per table. All policies are `TO authenticated` unless noted.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | `true` (any auth user) | none (trigger only) | `auth.uid() = id` | none (cascade) |
| rooms | `owner_id = auth.uid() OR visibility = 'public' OR is_room_member(id)` | `owner_id = auth.uid()` | `owner_id = auth.uid()` | `owner_id = auth.uid()` |
| room_members | self, room owner, or co-members | complex (see `1d:67-107` — 3 conditions: owner self-insert, discovery pending, premium auto-join) | `is_room_admin OR self` (updated in `2a:250-260`) | self, room owner, or admin |
| tracks | member, room owner, or public room visibility | `uploaded_by = auth.uid() AND member` | uploader, owner, or admin | uploader, owner, or admin |
| comments | self or (track is in accessible room) | self AND member of room | self only | self or admin/owner |
| invitations | room owner (updated `2a:227-233`) | room owner (updated `2a:220-225`) | room owner | room owner |
| track_plays | self only | self only | self only | self only |
| listening_events | self only | self only | self only | self only |
| polls | member or public room | member | creator or admin | creator or admin |
| poll_options | via parent poll access | poll creator | poll creator | poll creator |
| poll_votes | self or via parent poll | self AND member | self only | self only |
| game_sessions | member or public room | member | creator or admin | creator or admin |
| game_questions | via parent session | session creator | session creator | session creator |
| game_plays | self or admin | self AND member | self only | self only |
| game_session_answers | self or session creator | self AND member | self only | self only |
| game_session_scores | member or public room | self AND member | self only | self only |
| jam_sessions | member or public room | host AND member | host or room owner | host or room owner |
| jam_participants | self or via jam session | self AND member | self or jam host | self or jam host |
| ads | `true` (all authenticated) | `is_admin()` | `is_admin()` | `is_admin()` |
| ad_impressions | self or `is_admin()` | self only | none | none |
| premium_features | `true` | `is_admin()` | `is_admin()` | `is_admin()` |
| user_subscriptions | self or `is_admin()` | self only | self or `is_admin()` | none |
| payment_details | `true` | `is_admin()` | `is_admin()` | `is_admin()` |
| app_settings | `true` (column-level: `admin_password_hash` REVOKE SELECT in `6c:18`) | none | `is_admin()` | none |
| activity_logs | self or `is_admin()` | self or `is_admin()` | none | none |
| notifications | self only | none (via RPC only) | self only | none |
| room_messages | member or public room | self AND member | none | self, owner, or admin |
| offline_track_limits | self only | none | self only | none |

---

## 3c — FUNCTIONS / RPCs

### Non-admin functions

| Function | Args | Returns | Security Definer? | Description | Granted to |
|---|---|---|---|---|---|
| `handle_new_user()` | (none) | trigger | YES (`001:73`) | Auto-creates profile on signup; first user gets `is_admin=true` | trigger only (REVOKED from PUBLIC/anon/authenticated in `005:38`) |
| `is_admin()` | (none) | boolean | YES (`001:102`) | Returns `is_admin` value for `auth.uid()` from profiles | authenticated (`005:18`) |
| `is_room_member(uuid)` | `check_room_id` | boolean | YES (`002:144`) | Checks if caller is an active member of the room | authenticated (`005:21`) |
| `is_room_admin(uuid, uuid)` | `p_room_id, p_user_id` | boolean | YES (`2a:32`) | Checks if user is owner/admin with active status | authenticated (`2a:45`) |
| `get_entitlements(uuid)` | `p_user_id` | text | YES (`1d:40`) | Returns `'premium'` if user has active subscription, else `'free'` | authenticated (`1d:62`) |
| `start_jam(uuid)` | `p_room_id` | uuid | YES (`003:362`) | Ends existing active jam, creates new jam session, adds caller as participant | authenticated (`005:24`) |
| `end_jam(uuid)` | `p_jam_id` | void | YES (`003:387`) | Sets jam status to 'ended' if caller is host | authenticated (`005:27`) |
| `update_jam_state(uuid, uuid, numeric, boolean, jsonb)` | jam_id, track_id, position, is_playing, queue | void | YES (`003:408`) | Updates jam playback state if caller is host | authenticated (`005:30`) |
| `heartbeat_jam_participant(uuid)` | `p_jam_id` | void | YES (`003:426`) | Upserts participant last_seen_at | authenticated (`005:33`) |
| `expire_subscriptions()` | (none) | void | YES (`004:282`) | Marks subscriptions past expiry as 'expired' | authenticated (`005:36`) |
| `create_notification(uuid, text, uuid, text, text, uuid, uuid)` | user_id, type, actor_id, message, entity_type, entity_id, room_id | void | YES (`006:89`) | Validates actor = auth.uid(), inserts notification | authenticated (`006:101`, revoked from anon in `008:48`) |
| `mark_notification_read(uuid)` | `p_notification_id` | void | YES (`006:109`) | Marks notification as read for caller | authenticated (`006:117`) |
| `mark_all_notifications_read()` | (none) | void | YES (`006:126`) | Marks all caller's notifications as read | authenticated (`006:133`) |
| `create_room(text, text, text, text, text, text, boolean)` | name, description, visibility, join_policy, theme_color, passphrase, discoverable | TABLE(id uuid, name text) | YES (`4c:72`) | Enforces room limit via get_entitlements, inserts room + owner membership atomically | authenticated (`4c:113`) |
| `join_room(uuid, text)` | `p_room_id, p_passphrase` | TABLE(status text, message text) | YES (`2a:52`) | Checks passphrase for private rooms, enforces join_policy (premium gets instant, free gets pending) | authenticated (`2a:108`) |
| `redeem_invite(text)` | `p_token` | TABLE(success boolean, p_room_id uuid) | YES (`2a:114`) | Redeems invite token, inserts active member | authenticated (`2a:148`) |
| `approve_join_request(uuid)` | `p_member_id` | TABLE(success boolean, message text) | YES (`2a:155`) | Admin approves pending member | authenticated (`2a:182`) |
| `reject_join_request(uuid)` | `p_member_id` | TABLE(success boolean, message text) | YES (`2a:189`) | Admin rejects (deletes) pending member | authenticated (`2a:216`) |
| `get_offline_track_limit()` | (none) | integer | YES (`4c:121`) | Returns max offline tracks (100 premium, 3 free) | authenticated (`4c:137`) |
| `increment_offline_track_count(uuid)` | `p_track_id` | boolean | YES (`4c:142`) | Increments count if under limit, returns false if at limit | authenticated (`4c:174`) |
| `decrement_offline_track_count(uuid)` | `p_track_id` | void | YES (`4c:179`) | Decrements count (min 0) | authenticated (`4c:197`) |
| `verify_admin_password(text)` | `p_password` | boolean | YES (`1a:44`) | Compares password against `admin_password_hash` using `crypt()` | anon + authenticated (`7a:21`, originally `013:24`) |
| `update_subscription_webhook_status(uuid, text)` | `p_sub_id, p_status` | void | YES (`1c:50`) | Updates webhook_status on a subscription | authenticated (`1d:13`) |
| `public_get_webhook_url()` | (none) | text | YES (`019:143`) | Returns `payment_webhook_url` from app_settings (no password required) | anon + authenticated (`019:167`) |

### Admin functions (all SECURITY DEFINER, all accept `p_password` as first arg, all verify via `verify_admin_password()`)

All admin functions are granted to `anon, authenticated` (final state from `7a:21-61`). Each checks `verify_admin_password(p_password)` and returns `'unauthorized'`/`false`/`null` if the password is wrong.

| Function | Args (after password) | Returns | Description |
|---|---|---|---|
| `admin_get_overview` | — | jsonb | Stats (user/room/track/premium counts) + recent 15 activity logs |
| `admin_get_users` | — | jsonb | Up to 100 profiles |
| `admin_get_users_enhanced` | search text, limit int, offset int | jsonb | Users with subscription status + room count |
| `admin_get_user_details` | user_id uuid | jsonb | Single user with rooms, subscriptions, plays |
| `admin_update_user` | user_id, display_name, is_admin boolean, is_premium boolean | boolean | Updates profile + grants/revokes premium |
| `admin_delete_user` | user_id | boolean | Deletes user (cascade) |
| `admin_get_rooms` | — | jsonb | Up to 100 rooms |
| `admin_get_rooms_enhanced` | search text, limit int, offset int | jsonb | Rooms with member/track counts |
| `admin_get_room_details` | room_id | jsonb | Room with members, tracks, plays |
| `admin_delete_room` | room_id | boolean | Deletes room (cascade) |
| `admin_get_subscriptions` | — | jsonb | Up to 50 subscriptions with display_name |
| `admin_get_subscriptions_enhanced` | — | jsonb | All subscriptions with more detail |
| `admin_approve_subscription` | sub_id | boolean | Sets status='active', receipt_status='approved', expires_at=now()+1yr, sends notification |
| `admin_reject_subscription` | sub_id | boolean | Sets receipt_status='rejected', status='cancelled', sends notification |
| `admin_extend_subscription` | sub_id, months int | boolean | Extends expires_at by N months |
| `admin_grant_premium` | user_id, months int | boolean | Creates active subscription with expires_at now()+N months |
| `admin_revoke_premium` | user_id | boolean | Sets subscription status='expired' |
| `admin_get_premium_features` | — | jsonb | Returns all premium_features with sort_order |
| `admin_update_premium_feature` | feature, label, is_premium, description, sort_order(? ) | boolean | Updates a premium feature |
| `admin_add_premium_feature` | feature, label, description, sort_order(?), is_premium | boolean | Adds a new premium feature |
| `admin_delete_premium_feature` | feature | boolean | Deletes a premium feature |
| `admin_get_ads` | — | jsonb | Up to 50 ads |
| `admin_toggle_ad` | ad_id | text | Toggles ad between 'active' and 'paused' |
| `admin_create_ad` | title, description, video_path, video_url, trigger_type, trigger_types jsonb, trigger_config jsonb, starts_at, ends_at, show_to_premium, cta_url, cta_label, close_after_seconds, skip_duration_seconds | uuid | Creates new ad |
| `admin_update_ad` | same as create + ad_id | boolean | Updates ad |
| `admin_delete_ad` | ad_id | boolean | Deletes ad |
| `admin_send_announcement` | message | boolean | Creates notification for every user |
| `admin_get_recent_announcements` | — | jsonb | Recent announcements |
| `admin_get_settings` | — | jsonb | Returns app_settings row + active payment_details |
| `admin_save_settings` | max_rooms_free int, max_rooms_premium int, premium_popup_copy jsonb, premium_price numeric, premium_currency text, payment_webhook_url text | boolean | Updates app_settings (6 columns) |
| `admin_save_premium_pricing` | price numeric, currency text | boolean | Updates only premium_price + premium_currency |
| `admin_save_payment_details` | bank_name, account_name, account_number, routing_number, id uuid, instructions, custom_heading, custom_subtext, footer_note, is_active boolean, (11 args total) | boolean | Creates or updates payment_details |
| `admin_get_all_payment_details` | — | jsonb | All payment configs including inactive |
| `admin_get_webhook_url` | — | text | Returns payment_webhook_url |
| `admin_change_password` | current_password, new_password | boolean | Verifies current, updates admin_password_hash |
| `admin_get_analytics` | days int | jsonb | Time-series analytics (registrations, plays, etc.) |
| `admin_get_activity_logs` | search text, entity_type text, limit int, offset int | jsonb | Paginated activity logs |
| `admin_export_data` | entity_type | jsonb | Exports users/rooms/subscriptions as JSON |
| `admin_bug_check` | — | jsonb | Runs diagnostic queries |
| `admin_fix_bug` | bug_id text, fix_param text | boolean | Auto-fixes specific bugs |

**Total admin functions: ~41** (defined across migrations `013`, `015`, `016`, `019`)

---

## 3d — STORAGE BUCKETS

| Bucket | Public? | Migration | Purpose |
|---|---|---|---|
| `vinyl-audio` | **false** (set to private in `6a:50`) | `002:57` | Audio files. Originally public, made private for signed-URL access. |
| `vinyl-covers` | true | `002:61` | Room and track cover images |
| `vinyl-avatars` | true | `002:65` | User avatar images |
| `vinyl-chat` | true | `008:28` | Chat media uploads (images, videos) |
| `vinyl-receipts` | **false** (private) | `6a:81` | Payment receipt uploads. Private — only owner can read/delete. |

### Storage policies (final state after `6a`):

- **vinyl-audio**: SELECT (authenticated), INSERT (authenticated), DELETE (authenticated + owner = auth.uid()) — `6a:116`
- **vinyl-covers**: SELECT (public, via `002:86`), INSERT (authenticated), DELETE (authenticated + owner) — `6a:130`
- **vinyl-avatars**: SELECT (public, via `002:98`), INSERT (authenticated), DELETE (authenticated + owner) — `6a:123`
- **vinyl-chat**: SELECT (authenticated), INSERT (authenticated + owner), DELETE (authenticated + owner) — `6a:60-75`
- **vinyl-receipts**: SELECT (authenticated + owner), INSERT (authenticated + owner), DELETE (authenticated + owner) — `6a:89-104`

---

## 3e — SCHEMA DRIFT (client references vs migrations)

### Tables referenced by client (`supabase.from('...')` calls)

| Table name | Client references | Exists in migration? |
|---|---|---|
| profiles | `AuthContext.tsx:29`, `ProfilePage.tsx` | YES (`001:42`) |
| rooms | `HomePage.tsx`, `RoomPage.tsx`, `RoomSettingsModal.tsx`, `useBackgroundPreload.ts` | YES (`002:108`) |
| room_members | `HomePage.tsx`, `RoomPage.tsx`, `RoomSettingsModal.tsx`, `ProfilePage.tsx`, `useBackgroundPreload.ts` | YES (`002:126`) |
| tracks | `RoomPage.tsx`, `JamBanner.tsx`, `useBackgroundPreload.ts`, `ProfilePage.tsx` | YES (`002:227`) |
| track_plays | `usePlayer.ts`, `ProfilePage.tsx`, `RoomPage.tsx` | YES (`002:386`) |
| listening_events | `NowPlayingView.tsx:27` | YES (`002:411`) |
| invitations | `RoomSettingsModal.tsx` | YES (`002:344`) |
| comments | NOT FOUND in client `from()` calls — **the `comments` table is never referenced by the client** | YES (exists in DB) |
| polls | `PollsTab.tsx` | YES (`003:25`) |
| poll_options | `PollsTab.tsx:184` | YES (`003:58`) |
| poll_votes | `PollsTab.tsx` | YES (`003:87`) |
| game_sessions | `GamesTab.tsx` | YES (`003:116`) |
| game_questions | `GamesTab.tsx` | YES (`003:156`) |
| game_plays | `GamesTab.tsx` | YES (`003:189`) |
| game_session_answers | `GamesTab.tsx:115` | YES (`003:226`) |
| game_session_scores | `GamesTab.tsx` | YES (`003:259`) |
| jam_sessions | `JamBanner.tsx:26` | YES (`003:292`) |
| jam_participants | `JamBanner.tsx:35` | YES (`003:327`) |
| ads | NOT FOUND in client `from()` calls | YES (`004:58`) |
| ad_impressions | NOT FOUND in client `from()` calls | YES (`004:102`) |
| premium_features | `PremiumContext.tsx` | YES (`004:123`) |
| user_subscriptions | `SubscribeModal.tsx`, `PremiumContext.tsx` | YES (`004:161`) |
| payment_details | `SubscribeModal.tsx:71` | YES (`004:192`) |
| app_settings | `PremiumContext.tsx:38` | YES (`004:228`) |
| activity_logs | NOT FOUND in client `from()` calls | YES (`004:253`) |
| notifications | `NotificationsContext.tsx` | YES (`006:46`) |
| room_messages | `RoomPage.tsx` | YES (`006:138`) |
| offline_track_limits | NOT FOUND in client `from()` calls (accessed only via RPCs) | YES (`4c:39`) |

### RPCs referenced by client (`supabase.rpc('...')` calls)

All 50 unique RPC calls confirmed to exist in migrations. No drift found.

### Storage buckets referenced by client

| Bucket | Client references | Exists in migration? |
|---|---|---|
| vinyl-audio | `audioUrl.ts`, `RoomPage.tsx` (upload + remove) | YES |
| vinyl-covers | `RoomPage.tsx` (upload + getPublicUrl) | YES |
| vinyl-avatars | `ProfilePage.tsx` (upload + getPublicUrl) | YES |
| vinyl-chat | `RoomPage.tsx` (upload + getPublicUrl) | YES |
| vinyl-receipts | `SubscribeModal.tsx` (upload) | YES |

### Drift findings

1. **`comments` table** — exists in DB but the client never references it. Comments may have been replaced by `room_messages` chat system.
2. **`ads` and `ad_impressions` tables** — exist in DB, admin RPCs manage them, but the client never queries them directly via `.from()`. No ad rendering component found.
3. **`activity_logs` table** — exists in DB but client never queries directly. Written to by admin functions only.
