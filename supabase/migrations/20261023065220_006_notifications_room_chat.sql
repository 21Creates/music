/*
# Notifications and Room Chat

## Overview
Adds two new features to the platform:
1. A notifications system that tracks user activity across the app (comments, replies, jam starts, polls, games, member joins, mentions, etc.)
2. A real-time room chat system for general conversation within music rooms

## New Tables

### notifications
- id (uuid PK)
- user_id (uuid, recipient -- the person who receives the notification)
- actor_id (uuid, nullable -- who triggered it)
- type (text: comment_on_track, reply_to_comment, jam_started, poll_created, game_created, member_joined, join_request, premium_approved, premium_rejected, mention, chat_message, announcement)
- entity_type (text, nullable -- e.g. 'track', 'poll', 'game', 'room')
- entity_id (uuid, nullable)
- room_id (uuid, nullable, FK to rooms)
- message (text)
- is_read (boolean, default false)
- created_at (timestamptz)

### room_messages
- id (uuid PK)
- room_id (uuid, FK to rooms, cascade)
- user_id (uuid, default auth.uid(), FK to auth.users, cascade)
- text (text)
- shared_track_id (uuid, nullable, FK to tracks, set null on delete)
- reply_to (uuid, nullable, FK to room_messages, cascade)
- created_at (timestamptz)

## RPCs
- create_notification(p_user_id, p_type, p_actor_id, p_message, p_entity_type, p_entity_id, p_room_id) -- SECURITY DEFINER, validates actor and inserts. Returns void.
- mark_notification_read(p_notification_id) -- marks a single notification as read for the caller
- mark_all_notifications_read() -- marks all of the caller's notifications as read

## Security
- notifications: RLS enabled. Users can only SELECT/UPDATE their own notifications. INSERT only via the create_notification RPC (SECURITY DEFINER). No DELETE from client.
- room_messages: RLS enabled. Room members can SELECT all messages in their rooms. Users can INSERT their own messages. Users can DELETE their own messages. Admins/owners can DELETE any message.
- create_notification RPC: SECURITY DEFINER, granted to authenticated. Validates that actor_id matches auth.uid() when an actor is provided.
*/

-- ============================================================
-- notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'comment_on_track', 'reply_to_comment', 'jam_started', 'poll_created',
    'game_created', 'member_joined', 'join_request', 'premium_approved',
    'premium_rejected', 'mention', 'chat_message', 'announcement'
  )),
  entity_type text,
  entity_id uuid,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- create_notification RPC
-- ============================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid DEFAULT NULL,
  p_message text DEFAULT '',
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_room_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Actor ID must match authenticated user';
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, message, entity_type, entity_id, room_id)
  VALUES (p_user_id, p_actor_id, p_type, p_message, p_entity_type, p_entity_id, p_room_id);
END;
$$;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) TO authenticated;

-- ============================================================
-- mark_notification_read RPC
-- ============================================================
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;

-- ============================================================
-- mark_all_notifications_read RPC
-- ============================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- ============================================================
-- room_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  shared_track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  reply_to uuid REFERENCES room_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON room_messages TO authenticated;

DROP POLICY IF EXISTS "room_messages_select" ON room_messages;
CREATE POLICY "room_messages_select" ON room_messages FOR SELECT
  TO authenticated
  USING (
    is_room_member(room_id)
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_messages.room_id AND (rooms.owner_id = auth.uid() OR rooms.visibility = 'public'))
  );

DROP POLICY IF EXISTS "room_messages_insert" ON room_messages;
CREATE POLICY "room_messages_insert" ON room_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_messages.room_id AND rooms.owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "room_messages_delete" ON room_messages;
CREATE POLICY "room_messages_delete" ON room_messages FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_messages.room_id AND rooms.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_messages.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active')
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_room_messages_reply ON room_messages(reply_to);
