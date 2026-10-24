-- Add foreign keys to profiles table so PostgREST embeds work.
-- All existing FKs point to auth.users, but code uses embeds like
-- profiles!polls_created_by_fkey(*) which require FK -> profiles.

-- First, drop the existing FK constraints that point to auth.users,
-- then re-add them pointing to profiles instead.

-- polls.created_by
ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey;
ALTER TABLE polls ADD CONSTRAINT polls_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- tracks.uploaded_by
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_uploaded_by_fkey;
ALTER TABLE tracks ADD CONSTRAINT tracks_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- game_sessions.created_by
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_created_by_fkey;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- game_sessions.winner_id
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_winner_id_fkey;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- game_session_scores.user_id
ALTER TABLE game_session_scores DROP CONSTRAINT IF EXISTS game_session_scores_user_id_fkey;
ALTER TABLE game_session_scores ADD CONSTRAINT game_session_scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- room_members.user_id
ALTER TABLE room_members DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;
ALTER TABLE room_members ADD CONSTRAINT room_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- room_messages.user_id
ALTER TABLE room_messages DROP CONSTRAINT IF EXISTS room_messages_user_id_fkey;
ALTER TABLE room_messages ADD CONSTRAINT room_messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- comments.user_id
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- poll_votes.user_id
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;
ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- jam_sessions.host_id
ALTER TABLE jam_sessions DROP CONSTRAINT IF EXISTS jam_sessions_host_id_fkey;
ALTER TABLE jam_sessions ADD CONSTRAINT jam_sessions_host_id_fkey
  FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- jam_participants.user_id
ALTER TABLE jam_participants DROP CONSTRAINT IF EXISTS jam_participants_user_id_fkey;
ALTER TABLE jam_participants ADD CONSTRAINT jam_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- notifications.user_id
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- notifications.actor_id
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- game_plays.user_id
ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_user_id_fkey;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- game_session_answers.user_id
ALTER TABLE game_session_answers DROP CONSTRAINT IF EXISTS game_session_answers_user_id_fkey;
ALTER TABLE game_session_answers ADD CONSTRAINT game_session_answers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- rooms.owner_id
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_owner_id_fkey;
ALTER TABLE rooms ADD CONSTRAINT rooms_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- invitations.created_by
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_created_by_fkey;
ALTER TABLE invitations ADD CONSTRAINT invitations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- track_plays.user_id
ALTER TABLE track_plays DROP CONSTRAINT IF EXISTS track_plays_user_id_fkey;
ALTER TABLE track_plays ADD CONSTRAINT track_plays_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- listening_events.user_id
ALTER TABLE listening_events DROP CONSTRAINT IF EXISTS listening_events_user_id_fkey;
ALTER TABLE listening_events ADD CONSTRAINT listening_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ad_impressions.user_id
ALTER TABLE ad_impressions DROP CONSTRAINT IF EXISTS ad_impressions_user_id_fkey;
ALTER TABLE ad_impressions ADD CONSTRAINT ad_impressions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- activity_logs.user_id
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- user_subscriptions.user_id
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
