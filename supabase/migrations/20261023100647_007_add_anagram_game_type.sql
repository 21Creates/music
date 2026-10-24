/*
# Add Anagram Game Type

1. Changes
- Add 'anagram' to the game_type CHECK constraint on game_sessions.
- This allows admins to create anagram games where players rearrange
  scrambled letters of a song title to guess the correct answer.

2. Security
- No new tables or policies needed.
- Existing RLS policies on game_sessions and game_questions already
  allow creators and room admins to update and delete games and questions.
- No grants to add — game_sessions and game_questions already have
  SELECT, INSERT, UPDATE, DELETE granted to authenticated.

3. Important Notes
- This migration is idempotent: it drops the old constraint and recreates
  it with the new value included.
- Existing games are unaffected; their game_type values are still valid.
*/

ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_game_type_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_game_type_check
  CHECK (game_type IN ('complete_line', 'timer_question', 'four_pics', 'mixed', 'anagram'));