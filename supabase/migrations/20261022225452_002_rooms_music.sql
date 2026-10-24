/*
# Rooms, Tracks, Comments, and Music Infrastructure

## Overview
This migration creates the core music room infrastructure: rooms where users collaborate,
room membership management, audio tracks within rooms, time-stamped comments on tracks,
invitation tokens, play tracking, and listening analytics. It also creates three storage
buckets for audio files, cover images, and user avatars.

## New Tables
### rooms
- id, name, description, owner_id (default auth.uid()), cover_url, visibility, join_policy,
  invite_code (auto-generated unique 6-char), theme_color, passphrase, created_at

### room_members
- id, room_id (FK cascade), user_id (default auth.uid()), role (owner/admin/member),
  status (active/pending/banned), created_at, nda_accepted_at. Unique(room_id, user_id).

### tracks
- id, room_id (FK cascade), uploaded_by (default auth.uid()), title, file_path,
  duration_seconds, cover_url, created_at

### comments
- id, track_id (FK cascade), user_id (default auth.uid()), text, timestamp_seconds,
  parent_id (FK cascade for threading), gif_url, sticker_id, comment_media, created_at

### invitations
- id, room_id (FK cascade), created_by (default auth.uid()), token (unique auto-gen),
  used, expires_at, created_at

### track_plays
- id, room_id, track_id, user_id (default auth.uid()), played_at

### listening_events
- id, room_id, track_id, user_id (default auth.uid()), listened_seconds, created_at

## Storage Buckets
- vinyl-audio (public) — uploaded audio files
- vinyl-covers (public) — room and track cover images
- vinyl-avatars (public) — user avatar images

## Security
- RLS on all tables, grants to authenticated only.
- rooms: owner CRUD, members + public rooms SELECTable.
- room_members: members see co-members, self-insert, self/owner-admin update/delete.
- tracks: members SELECT/INSERT, owner/admin UPDATE/DELETE.
- comments: members SELECT, author INSERT/UPDATE, author or admin DELETE.
- invitations: members SELECT, members INSERT, creator/owner UPDATE/DELETE.
- track_plays & listening_events: self-only CRUD.
- Helper function is_room_member() defined after room_members table.
*/

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vinyl-audio', 'vinyl-audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vinyl-covers', 'vinyl-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vinyl-avatars', 'vinyl-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "audio_upload" ON storage.objects;
CREATE POLICY "audio_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vinyl-audio');

DROP POLICY IF EXISTS "audio_read" ON storage.objects;
CREATE POLICY "audio_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vinyl-audio');

DROP POLICY IF EXISTS "audio_delete" ON storage.objects;
CREATE POLICY "audio_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vinyl-audio');

DROP POLICY IF EXISTS "covers_upload" ON storage.objects;
CREATE POLICY "covers_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vinyl-covers');

DROP POLICY IF EXISTS "covers_read" ON storage.objects;
CREATE POLICY "covers_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vinyl-covers');

DROP POLICY IF EXISTS "covers_delete" ON storage.objects;
CREATE POLICY "covers_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vinyl-covers');

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vinyl-avatars');

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vinyl-avatars');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vinyl-avatars');

-- ============================================================
-- rooms table (no policies yet — defined after helper)
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_url text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  join_policy text NOT NULL DEFAULT 'open' CHECK (join_policy IN ('open', 'request')),
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  theme_color text DEFAULT '#6366f1',
  passphrase text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- room_members table
-- ============================================================
CREATE TABLE IF NOT EXISTS room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  nda_accepted_at timestamptz,
  UNIQUE(room_id, user_id)
);
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: is_room_member (defined after room_members exists)
-- ============================================================
CREATE OR REPLACE FUNCTION is_room_member(check_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = check_room_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;
GRANT EXECUTE ON FUNCTION is_room_member(uuid) TO authenticated;

-- ============================================================
-- rooms policies
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;

DROP POLICY IF EXISTS "rooms_select" ON rooms;
CREATE POLICY "rooms_select" ON rooms FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR visibility = 'public' OR is_room_member(id));

DROP POLICY IF EXISTS "rooms_insert" ON rooms;
CREATE POLICY "rooms_insert" ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "rooms_update" ON rooms;
CREATE POLICY "rooms_update" ON rooms FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "rooms_delete" ON rooms;
CREATE POLICY "rooms_delete" ON rooms FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- room_members policies
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON room_members TO authenticated;

DROP POLICY IF EXISTS "room_members_select" ON room_members;
CREATE POLICY "room_members_select" ON room_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.owner_id = auth.uid())
    OR is_room_member(room_id)
  );

DROP POLICY IF EXISTS "room_members_insert" ON room_members;
CREATE POLICY "room_members_insert" ON room_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "room_members_update" ON room_members;
CREATE POLICY "room_members_update" ON room_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  );

DROP POLICY IF EXISTS "room_members_delete" ON room_members;
CREATE POLICY "room_members_delete" ON room_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  );

-- ============================================================
-- tracks table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  duration_seconds integer DEFAULT 0,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tracks TO authenticated;

DROP POLICY IF EXISTS "tracks_select" ON tracks;
CREATE POLICY "tracks_select" ON tracks FOR SELECT
  TO authenticated
  USING (
    is_room_member(room_id)
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.visibility = 'public')
  );

DROP POLICY IF EXISTS "tracks_insert" ON tracks;
CREATE POLICY "tracks_insert" ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "tracks_update" ON tracks;
CREATE POLICY "tracks_update" ON tracks FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = tracks.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = tracks.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  );

DROP POLICY IF EXISTS "tracks_delete" ON tracks;
CREATE POLICY "tracks_delete" ON tracks FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = tracks.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = tracks.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  );

-- ============================================================
-- comments table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text DEFAULT '',
  timestamp_seconds integer,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  gif_url text,
  sticker_id text,
  comment_media text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tracks t JOIN rooms r ON t.room_id = r.id
      WHERE t.id = comments.track_id
      AND (r.visibility = 'public' OR is_room_member(r.id) OR r.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tracks t
      WHERE t.id = comments.track_id
      AND (is_room_member(t.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = t.room_id AND r.owner_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "comments_update" ON comments;
CREATE POLICY "comments_update" ON comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tracks t JOIN rooms r ON t.room_id = r.id
      WHERE t.id = comments.track_id
      AND (r.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))
    )
  );

-- ============================================================
-- invitations table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;

DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select" ON invitations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR is_room_member(room_id)
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = invitations.room_id AND rooms.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = invitations.room_id AND rooms.owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update" ON invitations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = invitations.room_id AND rooms.owner_id = auth.uid()))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = invitations.room_id AND rooms.owner_id = auth.uid()));

DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = invitations.room_id AND rooms.owner_id = auth.uid()));

-- ============================================================
-- track_plays table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS track_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE track_plays ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON track_plays TO authenticated;

DROP POLICY IF EXISTS "track_plays_select" ON track_plays;
CREATE POLICY "track_plays_select" ON track_plays FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "track_plays_insert" ON track_plays;
CREATE POLICY "track_plays_insert" ON track_plays FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "track_plays_update" ON track_plays;
CREATE POLICY "track_plays_update" ON track_plays FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "track_plays_delete" ON track_plays;
CREATE POLICY "track_plays_delete" ON track_plays FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- listening_events table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS listening_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listened_seconds integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE listening_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON listening_events TO authenticated;

DROP POLICY IF EXISTS "listening_events_select" ON listening_events;
CREATE POLICY "listening_events_select" ON listening_events FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "listening_events_insert" ON listening_events;
CREATE POLICY "listening_events_insert" ON listening_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "listening_events_update" ON listening_events;
CREATE POLICY "listening_events_update" ON listening_events FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "listening_events_delete" ON listening_events;
CREATE POLICY "listening_events_delete" ON listening_events FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_room ON tracks(room_id);
CREATE INDEX IF NOT EXISTS idx_comments_track ON comments(track_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_invitations_room ON invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_track_plays_room ON track_plays(room_id);
CREATE INDEX IF NOT EXISTS idx_listening_events_user ON listening_events(user_id);
