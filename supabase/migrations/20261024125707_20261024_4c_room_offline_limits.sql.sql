/*
# Phase 4: Server-side room creation limit (R4) and offline track limit (O3)

## Summary
1. R4: Creates `create_room()` SECURITY DEFINER function that enforces the
   per-user room creation limit server-side by checking the user's owned room
   count against `app_settings.max_rooms_free` or `max_rooms_premium` (based on
   `get_entitlements()`). Also atomically inserts the room + owner room_members
   row in a single transaction, so the frontend no longer needs two inserts.

2. O3: Creates `can_save_offline_track()` SECURITY DEFINER function that
   returns whether the current user is allowed to save another track offline,
   based on their premium status and the count of tracks they have cached.
   The frontend calls this before allowing a save; the actual count is tracked
   in a new `offline_track_limits` table.

## New Tables
- `offline_track_limits`
  - `user_id` (uuid, PK, references auth.users)
  - `track_count` (integer, default 0)
  - `updated_at` (timestamptz, default now())

## New Functions
- `create_room(p_name, p_description, p_visibility, p_join_policy, p_theme_color,
  p_passphrase, p_discoverable)` — inserts room + owner membership, enforces limit
- `increment_offline_track_count(p_track_id uuid)` — increments count, enforces limit
- `decrement_offline_track_count(p_track_id uuid)` — decrements count
- `get_offline_track_limit()` — returns the user's max allowed offline tracks

## Security
- `offline_track_limits`: RLS enabled, authenticated-only, owner-scoped CRUD
- All new functions: SECURITY DEFINER, REVOKE from PUBLIC/anon, GRANT to authenticated
- `create_room` checks `get_entitlements()` for premium tier limit
*/

-- ============================================================
-- 1. offline_track_limits table
-- ============================================================
CREATE TABLE IF NOT EXISTS offline_track_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  track_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE offline_track_limits ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON offline_track_limits TO authenticated;

DROP POLICY IF EXISTS "offline_limits_select_own" ON offline_track_limits;
CREATE POLICY "offline_limits_select_own"
ON offline_track_limits FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "offline_limits_update_own" ON offline_track_limits;
CREATE POLICY "offline_limits_update_own"
ON offline_track_limits FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. create_room() function (R4)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_room(
  p_name text,
  p_description text,
  p_visibility text DEFAULT 'public',
  p_join_policy text DEFAULT 'open',
  p_theme_color text DEFAULT '#6366f1',
  p_passphrase text DEFAULT NULL,
  p_discoverable boolean DEFAULT false
) RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_entitlement text;
  v_max_rooms integer;
  v_current_count integer;
  v_room_id uuid;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_entitlement := get_entitlements(v_owner);

  SELECT COALESCE(
    CASE WHEN v_entitlement = 'premium' THEN max_rooms_premium ELSE max_rooms_free END,
    CASE WHEN v_entitlement = 'premium' THEN 20 ELSE 3 END
  ) INTO v_max_rooms
  FROM app_settings WHERE id = 1;

  SELECT count(*) INTO v_current_count
  FROM rooms WHERE owner_id = v_owner;

  IF v_current_count >= v_max_rooms THEN
    RAISE EXCEPTION 'Room limit reached (%)', v_max_rooms;
  END IF;

  INSERT INTO rooms (name, description, owner_id, visibility, join_policy, theme_color, passphrase, discoverable)
  VALUES (p_name, p_description, v_owner, p_visibility, p_join_policy, p_theme_color, NULLIF(p_passphrase, ''), p_discoverable AND p_visibility = 'public')
  RETURNING id INTO v_room_id;

  INSERT INTO room_members (room_id, user_id, role, status)
  VALUES (v_room_id, v_owner, 'owner', 'active');

  RETURN QUERY SELECT v_room_id, p_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_room(text, text, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_room(text, text, text, text, text, text, boolean) TO authenticated;

-- ============================================================
-- 3. Offline track limit functions (O3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_offline_track_limit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entitlement text;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;
  v_entitlement := get_entitlements(v_user);
  RETURN CASE WHEN v_entitlement = 'premium' THEN 100 ELSE 3 END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_offline_track_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_offline_track_limit() TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_offline_track_count(p_track_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer;
  v_current integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  v_limit := public.get_offline_track_limit();
  SELECT COALESCE(track_count, 0) INTO v_current
  FROM offline_track_limits WHERE user_id = v_user;

  IF v_current >= v_limit THEN
    RETURN false;
  END IF;

  INSERT INTO offline_track_limits (user_id, track_count)
  VALUES (v_user, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET track_count = offline_track_limits.track_count + 1,
                 updated_at = now()
  WHERE offline_track_limits.user_id = v_user;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_offline_track_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_offline_track_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decrement_offline_track_count(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  UPDATE offline_track_limits
  SET track_count = GREATEST(0, track_count - 1),
      updated_at = now()
  WHERE user_id = v_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_offline_track_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_offline_track_count(uuid) TO authenticated;
