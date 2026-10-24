/*
# Polls, Games, and Jam Sessions

## Overview
Adds interactive features to music rooms: polls/surveys, game sessions (trivia-style),
and jam sessions for synchronized group listening with realtime playback sync.

## New Tables
- polls, poll_options, poll_votes — room-scoped voting
- game_sessions, game_questions, game_plays, game_session_answers, game_session_scores
- jam_sessions, jam_participants — realtime group listening

## New RPCs
- start_jam, end_jam, update_jam_state, heartbeat_jam_participant

## Security
- RLS on all tables, grants to authenticated.
- Membership-based access via is_room_member() helper.
- RPCs are SECURITY DEFINER, granted to authenticated.
*/

-- ============================================================
-- polls table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text DEFAULT 'poll' CHECK (type IN ('poll', 'survey')),
  multiple_choice boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON polls TO authenticated;

DROP POLICY IF EXISTS "polls_select" ON polls;
CREATE POLICY "polls_select" ON polls FOR SELECT TO authenticated
  USING (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = polls.room_id AND (rooms.owner_id = auth.uid() OR rooms.visibility = 'public')));

DROP POLICY IF EXISTS "polls_insert" ON polls;
CREATE POLICY "polls_insert" ON polls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = polls.room_id AND rooms.owner_id = auth.uid())));

DROP POLICY IF EXISTS "polls_update" ON polls;
CREATE POLICY "polls_update" ON polls FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = polls.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = polls.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))));

DROP POLICY IF EXISTS "polls_delete" ON polls;
CREATE POLICY "polls_delete" ON polls FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = polls.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))));

-- ============================================================
-- poll_options table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON poll_options TO authenticated;

DROP POLICY IF EXISTS "poll_options_select" ON poll_options;
CREATE POLICY "poll_options_select" ON poll_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND (is_room_member(p.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = p.room_id AND (r.owner_id = auth.uid() OR r.visibility = 'public')))));

DROP POLICY IF EXISTS "poll_options_insert" ON poll_options;
CREATE POLICY "poll_options_insert" ON poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "poll_options_update" ON poll_options;
CREATE POLICY "poll_options_update" ON poll_options FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS "poll_options_delete" ON poll_options;
CREATE POLICY "poll_options_delete" ON poll_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()));

-- ============================================================
-- poll_votes table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON poll_votes TO authenticated;

DROP POLICY IF EXISTS "poll_votes_select" ON poll_votes;
CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_votes.poll_id AND (is_room_member(p.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = p.room_id AND (r.owner_id = auth.uid() OR r.visibility = 'public')))));

DROP POLICY IF EXISTS "poll_votes_insert" ON poll_votes;
CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_votes.poll_id AND (is_room_member(p.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = p.room_id AND r.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "poll_votes_update" ON poll_votes;
CREATE POLICY "poll_votes_update" ON poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "poll_votes_delete" ON poll_votes;
CREATE POLICY "poll_votes_delete" ON poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- game_sessions table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL DEFAULT 'mixed' CHECK (game_type IN ('complete_line', 'timer_question', 'four_pics', 'mixed')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  duration_seconds integer DEFAULT 60,
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  repeat_questions boolean NOT NULL DEFAULT false,
  is_permanent boolean NOT NULL DEFAULT false,
  title text DEFAULT '',
  play_requirement integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_sessions TO authenticated;

DROP POLICY IF EXISTS "game_sessions_select" ON game_sessions;
CREATE POLICY "game_sessions_select" ON game_sessions FOR SELECT TO authenticated
  USING (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = game_sessions.room_id AND (rooms.owner_id = auth.uid() OR rooms.visibility = 'public')));

DROP POLICY IF EXISTS "game_sessions_insert" ON game_sessions;
CREATE POLICY "game_sessions_insert" ON game_sessions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = game_sessions.room_id AND rooms.owner_id = auth.uid())));

DROP POLICY IF EXISTS "game_sessions_update" ON game_sessions;
CREATE POLICY "game_sessions_update" ON game_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_sessions.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_sessions.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))));

DROP POLICY IF EXISTS "game_sessions_delete" ON game_sessions;
CREATE POLICY "game_sessions_delete" ON game_sessions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_sessions.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))));

-- ============================================================
-- game_questions table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS game_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question text NOT NULL,
  correct_answer text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_type text DEFAULT 'text',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_questions TO authenticated;

DROP POLICY IF EXISTS "game_questions_select" ON game_questions;
CREATE POLICY "game_questions_select" ON game_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_questions.session_id AND (is_room_member(gs.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = gs.room_id AND (r.owner_id = auth.uid() OR r.visibility = 'public')))));

DROP POLICY IF EXISTS "game_questions_insert" ON game_questions;
CREATE POLICY "game_questions_insert" ON game_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_questions.session_id AND gs.created_by = auth.uid()));

DROP POLICY IF EXISTS "game_questions_update" ON game_questions;
CREATE POLICY "game_questions_update" ON game_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_questions.session_id AND gs.created_by = auth.uid()));

DROP POLICY IF EXISTS "game_questions_delete" ON game_questions;
CREATE POLICY "game_questions_delete" ON game_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_questions.session_id AND gs.created_by = auth.uid()));

-- ============================================================
-- game_plays table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  completed_at timestamptz,
  total_points integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  avg_time_ms integer NOT NULL DEFAULT 0,
  play_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_plays TO authenticated;

DROP POLICY IF EXISTS "game_plays_select" ON game_plays;
CREATE POLICY "game_plays_select" ON game_plays FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_plays.room_id AND (r.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid() AND rm.role IN ('owner','admin') AND rm.status = 'active'))));

DROP POLICY IF EXISTS "game_plays_insert" ON game_plays;
CREATE POLICY "game_plays_insert" ON game_plays FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_plays.game_id AND (is_room_member(gs.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = gs.room_id AND r.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "game_plays_update" ON game_plays;
CREATE POLICY "game_plays_update" ON game_plays FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "game_plays_delete" ON game_plays;
CREATE POLICY "game_plays_delete" ON game_plays FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- game_session_answers table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS game_session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  answer text NOT NULL DEFAULT '',
  time_ms integer NOT NULL DEFAULT 0,
  is_correct boolean NOT NULL DEFAULT false,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game_session_answers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_session_answers TO authenticated;

DROP POLICY IF EXISTS "game_answers_select" ON game_session_answers;
CREATE POLICY "game_answers_select" ON game_session_answers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_session_answers.session_id AND gs.created_by = auth.uid()));

DROP POLICY IF EXISTS "game_answers_insert" ON game_session_answers;
CREATE POLICY "game_answers_insert" ON game_session_answers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_session_answers.session_id AND (is_room_member(gs.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = gs.room_id AND r.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "game_answers_update" ON game_session_answers;
CREATE POLICY "game_answers_update" ON game_session_answers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "game_answers_delete" ON game_session_answers;
CREATE POLICY "game_answers_delete" ON game_session_answers FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- game_session_scores table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS game_session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  avg_time_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE game_session_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_session_scores TO authenticated;

DROP POLICY IF EXISTS "game_scores_select" ON game_session_scores;
CREATE POLICY "game_scores_select" ON game_session_scores FOR SELECT TO authenticated
  USING (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_session_scores.room_id AND (r.owner_id = auth.uid() OR r.visibility = 'public')));

DROP POLICY IF EXISTS "game_scores_insert" ON game_session_scores;
CREATE POLICY "game_scores_insert" ON game_session_scores FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM game_sessions gs WHERE gs.id = game_session_scores.session_id AND (is_room_member(gs.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = gs.room_id AND r.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "game_scores_update" ON game_session_scores;
CREATE POLICY "game_scores_update" ON game_session_scores FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "game_scores_delete" ON game_session_scores;
CREATE POLICY "game_scores_delete" ON game_session_scores FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- jam_sessions table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS jam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  current_track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  position_seconds numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  queue_track_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE jam_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON jam_sessions TO authenticated;

DROP POLICY IF EXISTS "jam_sessions_select" ON jam_sessions;
CREATE POLICY "jam_sessions_select" ON jam_sessions FOR SELECT TO authenticated
  USING (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = jam_sessions.room_id AND (rooms.owner_id = auth.uid() OR rooms.visibility = 'public')));

DROP POLICY IF EXISTS "jam_sessions_insert" ON jam_sessions;
CREATE POLICY "jam_sessions_insert" ON jam_sessions FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND (is_room_member(room_id) OR EXISTS (SELECT 1 FROM rooms WHERE rooms.id = jam_sessions.room_id AND rooms.owner_id = auth.uid())));

DROP POLICY IF EXISTS "jam_sessions_update" ON jam_sessions;
CREATE POLICY "jam_sessions_update" ON jam_sessions FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = jam_sessions.room_id AND r.owner_id = auth.uid()))
  WITH CHECK (host_id = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = jam_sessions.room_id AND r.owner_id = auth.uid()));

DROP POLICY IF EXISTS "jam_sessions_delete" ON jam_sessions;
CREATE POLICY "jam_sessions_delete" ON jam_sessions FOR DELETE TO authenticated
  USING (host_id = auth.uid() OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = jam_sessions.room_id AND r.owner_id = auth.uid()));

-- ============================================================
-- jam_participants table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS jam_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id uuid NOT NULL REFERENCES jam_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(jam_id, user_id)
);
ALTER TABLE jam_participants ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON jam_participants TO authenticated;

DROP POLICY IF EXISTS "jam_participants_select" ON jam_participants;
CREATE POLICY "jam_participants_select" ON jam_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM jam_sessions js WHERE js.id = jam_participants.jam_id AND (is_room_member(js.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = js.room_id AND (r.owner_id = auth.uid() OR r.visibility = 'public')))));

DROP POLICY IF EXISTS "jam_participants_insert" ON jam_participants;
CREATE POLICY "jam_participants_insert" ON jam_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM jam_sessions js WHERE js.id = jam_participants.jam_id AND (is_room_member(js.room_id) OR EXISTS (SELECT 1 FROM rooms r WHERE r.id = js.room_id AND r.owner_id = auth.uid()))));

DROP POLICY IF EXISTS "jam_participants_update" ON jam_participants;
CREATE POLICY "jam_participants_update" ON jam_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM jam_sessions js WHERE js.id = jam_participants.jam_id AND js.host_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM jam_sessions js WHERE js.id = jam_participants.jam_id AND js.host_id = auth.uid()));

DROP POLICY IF EXISTS "jam_participants_delete" ON jam_participants;
CREATE POLICY "jam_participants_delete" ON jam_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM jam_sessions js WHERE js.id = jam_participants.jam_id AND js.host_id = auth.uid()));

-- ============================================================
-- RPCs (variables prefixed v_ to avoid column name conflicts)
-- ============================================================

CREATE OR REPLACE FUNCTION start_jam(p_room_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jam_id uuid;
BEGIN
  UPDATE jam_sessions SET status = 'ended', ended_at = now()
    WHERE room_id = p_room_id AND status = 'active';

  INSERT INTO jam_sessions (room_id, host_id, status, is_playing)
  VALUES (p_room_id, auth.uid(), 'active', false)
  RETURNING id INTO v_jam_id;

  INSERT INTO jam_participants (jam_id, user_id)
  VALUES (v_jam_id, auth.uid())
  ON CONFLICT (jam_id, user_id) DO UPDATE SET last_seen_at = now();

  RETURN v_jam_id;
END;
$$;
GRANT EXECUTE ON FUNCTION start_jam(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION end_jam(p_jam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jam_sessions
  SET status = 'ended', ended_at = now(), is_playing = false
  WHERE id = p_jam_id AND host_id = auth.uid() AND status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION end_jam(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION update_jam_state(
  p_jam_id uuid,
  p_track_id uuid DEFAULT NULL,
  p_position numeric DEFAULT 0,
  p_is_playing boolean DEFAULT false,
  p_queue jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jam_sessions
  SET
    current_track_id = COALESCE(p_track_id, current_track_id),
    position_seconds = p_position,
    is_playing = p_is_playing,
    queue_track_ids = COALESCE(NULLIF(p_queue, '[]'::jsonb), queue_track_ids)
  WHERE id = p_jam_id AND host_id = auth.uid() AND status = 'active';
END;
$$;
GRANT EXECUTE ON FUNCTION update_jam_state(uuid, uuid, numeric, boolean, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION heartbeat_jam_participant(p_jam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO jam_participants (jam_id, user_id, last_seen_at)
  VALUES (p_jam_id, auth.uid(), now())
  ON CONFLICT (jam_id, user_id) DO UPDATE SET last_seen_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION heartbeat_jam_participant(uuid) TO authenticated;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_polls_room ON polls(room_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_questions_session ON game_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_game ON game_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_game_plays_user ON game_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_session ON game_session_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_jam_sessions_room ON jam_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_jam_participants_jam ON jam_participants(jam_id);
