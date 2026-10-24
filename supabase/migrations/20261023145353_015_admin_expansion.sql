/*
# Admin Dashboard Expansion

## Overview
Adds comprehensive admin RPC functions to power the expanded admin dashboard:
- User management (update, delete, ban, toggle admin, grant premium)
- Room management (delete, view details with members/tracks)
- Ad management (create, update, delete)
- Premium management (manual grant, revoke, extend, feature flags)
- Payment details management (create/update)
- Analytics (30-day time-series data)
- Activity logs (paginated, filterable)
- Data export (full table data as JSON)
- Bug checker (orphaned records, data integrity)

## Security
All functions are SECURITY DEFINER, callable by anon and authenticated roles,
and verify the admin password via the existing verify_admin_password() function.
No new tables created - only functions added.
*/

-- ============================================================
-- 1. admin_update_user — update display_name, is_admin, ban status
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_user(
  p_password text,
  p_user_id uuid,
  p_display_name text DEFAULT NULL,
  p_is_admin boolean DEFAULT NULL,
  p_banned boolean DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE profiles SET
    display_name = COALESCE(p_display_name, display_name),
    is_admin = COALESCE(p_is_admin, is_admin)
  WHERE id = p_user_id;

  IF p_banned = true THEN
    DELETE FROM room_members WHERE user_id = p_user_id AND role != 'owner';
  END IF;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_update_user(text, uuid, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_user(text, uuid, text, boolean, boolean) TO anon, authenticated;

-- ============================================================
-- 2. admin_delete_user — delete a user's profile and cascading data
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_password text,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  DELETE FROM room_members WHERE user_id = p_user_id;
  DELETE FROM comments WHERE user_id = p_user_id;
  DELETE FROM track_plays WHERE user_id = p_user_id;
  DELETE FROM listening_events WHERE user_id = p_user_id;
  DELETE FROM game_plays WHERE user_id = p_user_id;
  DELETE FROM game_session_answers WHERE user_id = p_user_id;
  DELETE FROM game_session_scores WHERE user_id = p_user_id;
  DELETE FROM jam_participants WHERE user_id = p_user_id;
  DELETE FROM poll_votes WHERE user_id = p_user_id;
  DELETE FROM room_messages WHERE user_id = p_user_id;
  DELETE FROM ad_impressions WHERE user_id = p_user_id;
  DELETE FROM user_subscriptions WHERE user_id = p_user_id;
  DELETE FROM activity_logs WHERE user_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM tracks WHERE uploaded_by = p_user_id;
  DELETE FROM rooms WHERE owner_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_delete_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_user(text, uuid) TO anon, authenticated;

-- ============================================================
-- 3. admin_get_user_details — rooms owned, tracks uploaded, subs
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_user_details(
  p_password text,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM (SELECT id, display_name, avatar_url, is_admin, created_at FROM profiles WHERE id = p_user_id) p),
    'rooms_owned', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'created_at', created_at))
      FROM rooms WHERE owner_id = p_user_id
    ), '[]'::jsonb),
    'tracks_uploaded', (SELECT count(*) FROM tracks WHERE uploaded_by = p_user_id),
    'subscriptions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'status', status, 'receipt_status', receipt_status, 'created_at', created_at, 'expires_at', expires_at))
      FROM user_subscriptions WHERE user_id = p_user_id
    ), '[]'::jsonb),
    'rooms_joined', (SELECT count(*) FROM room_members WHERE user_id = p_user_id)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_user_details(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_user_details(text, uuid) TO anon, authenticated;

-- ============================================================
-- 4. admin_delete_room — delete a room and all its data
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_room(
  p_password text,
  p_room_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  DELETE FROM listening_events WHERE room_id = p_room_id;
  DELETE FROM track_plays WHERE room_id = p_room_id;
  DELETE FROM game_plays WHERE room_id = p_room_id;
  DELETE FROM game_session_scores WHERE room_id = p_room_id;
  DELETE FROM game_session_answers sa USING game_sessions gs WHERE gs.id = sa.session_id AND gs.room_id = p_room_id;
  DELETE FROM game_questions gq USING game_sessions gs WHERE gs.id = gq.session_id AND gs.room_id = p_room_id;
  DELETE FROM game_sessions WHERE room_id = p_room_id;
  DELETE FROM jam_participants jp USING jam_sessions js WHERE js.id = jp.jam_id AND js.room_id = p_room_id;
  DELETE FROM jam_sessions WHERE room_id = p_room_id;
  DELETE FROM poll_votes pv USING polls p WHERE p.id = pv.poll_id AND p.room_id = p_room_id;
  DELETE FROM poll_options po USING polls p WHERE p.id = po.poll_id AND p.room_id = p_room_id;
  DELETE FROM polls WHERE room_id = p_room_id;
  DELETE FROM comments c USING tracks t WHERE t.id = c.track_id AND t.room_id = p_room_id;
  DELETE FROM tracks WHERE room_id = p_room_id;
  DELETE FROM room_messages WHERE room_id = p_room_id;
  DELETE FROM room_members WHERE room_id = p_room_id;
  DELETE FROM invitations WHERE room_id = p_room_id;
  DELETE FROM notifications WHERE room_id = p_room_id;
  DELETE FROM rooms WHERE id = p_room_id;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_delete_room(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_room(text, uuid) TO anon, authenticated;

-- ============================================================
-- 5. admin_get_room_details — members, tracks, polls count
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_room_details(
  p_password text,
  p_room_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'room', (SELECT row_to_json(r) FROM (SELECT * FROM rooms WHERE id = p_room_id) r),
    'member_count', (SELECT count(*) FROM room_members WHERE room_id = p_room_id),
    'track_count', (SELECT count(*) FROM tracks WHERE room_id = p_room_id),
    'comment_count', (SELECT count(*) FROM comments c JOIN tracks t ON t.id = c.track_id WHERE t.room_id = p_room_id),
    'poll_count', (SELECT count(*) FROM polls WHERE room_id = p_room_id),
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', rm.id, 'user_id', rm.user_id, 'role', rm.role, 'status', rm.status, 'display_name', p.display_name))
      FROM room_members rm
      LEFT JOIN profiles p ON p.id = rm.user_id
      WHERE rm.room_id = p_room_id
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_room_details(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_room_details(text, uuid) TO anon, authenticated;

-- ============================================================
-- 6. admin_create_ad — create a new ad
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_ad(
  p_password text,
  p_title text,
  p_description text DEFAULT '',
  p_video_url text DEFAULT NULL,
  p_trigger_type text DEFAULT 'on_any_page',
  p_trigger_types jsonb DEFAULT '[]'::jsonb,
  p_trigger_config jsonb DEFAULT '{}'::jsonb,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_show_to_premium boolean DEFAULT false,
  p_cta_url text DEFAULT NULL,
  p_cta_label text DEFAULT 'Learn More',
  p_close_after_seconds int DEFAULT 5,
  p_skip_duration_seconds int DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_id uuid;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  INSERT INTO ads (title, description, video_url, status, trigger_type, trigger_types, trigger_config,
    starts_at, ends_at, show_to_premium, cta_url, cta_label, close_after_seconds, skip_duration_seconds)
  VALUES (p_title, p_description, p_video_url, 'draft', p_trigger_type, p_trigger_types, p_trigger_config,
    p_starts_at, p_ends_at, p_show_to_premium, p_cta_url, p_cta_label, p_close_after_seconds, p_skip_duration_seconds)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_ad(text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_create_ad(text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, int, int) TO anon, authenticated;

-- ============================================================
-- 7. admin_update_ad — update an existing ad
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_ad(
  p_password text,
  p_ad_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_video_url text DEFAULT NULL,
  p_trigger_type text DEFAULT NULL,
  p_trigger_types jsonb DEFAULT NULL,
  p_trigger_config jsonb DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_show_to_premium boolean DEFAULT NULL,
  p_cta_url text DEFAULT NULL,
  p_cta_label text DEFAULT NULL,
  p_close_after_seconds int DEFAULT NULL,
  p_skip_duration_seconds int DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE ads SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    video_url = COALESCE(p_video_url, video_url),
    trigger_type = COALESCE(p_trigger_type, trigger_type),
    trigger_types = COALESCE(p_trigger_types, trigger_types),
    trigger_config = COALESCE(p_trigger_config, trigger_config),
    starts_at = COALESCE(p_starts_at, starts_at),
    ends_at = COALESCE(p_ends_at, ends_at),
    show_to_premium = COALESCE(p_show_to_premium, show_to_premium),
    cta_url = COALESCE(p_cta_url, cta_url),
    cta_label = COALESCE(p_cta_label, cta_label),
    close_after_seconds = COALESCE(p_close_after_seconds, close_after_seconds),
    skip_duration_seconds = COALESCE(p_skip_duration_seconds, skip_duration_seconds)
  WHERE id = p_ad_id;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_update_ad(text, uuid, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_ad(text, uuid, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, int, int) TO anon, authenticated;

-- ============================================================
-- 8. admin_delete_ad — delete an ad
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_ad(
  p_password text,
  p_ad_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  DELETE FROM ad_impressions WHERE ad_id = p_ad_id;
  DELETE FROM ads WHERE id = p_ad_id;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_delete_ad(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_ad(text, uuid) TO anon, authenticated;

-- ============================================================
-- 9. admin_grant_premium — manually grant premium without receipt
-- ============================================================
CREATE OR REPLACE FUNCTION admin_grant_premium(
  p_password text,
  p_user_id uuid,
  p_duration_days int DEFAULT 365
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_existing uuid;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  SELECT id INTO v_existing FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active' LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE user_subscriptions
    SET expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (p_duration_days || ' days')::interval
    WHERE id = v_existing;
  ELSE
    INSERT INTO user_subscriptions (user_id, status, payment_ref, payment_amount, receipt_status, granted_at, expires_at)
    VALUES (p_user_id, 'active', 'MANUAL_GRANT', 0, 'approved', now(), now() + (p_duration_days || ' days')::interval);
  END IF;

  PERFORM create_notification(p_user_id, 'premium_approved', null, 'You have been granted premium access!', null, null, null);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_grant_premium(text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_grant_premium(text, uuid, int) TO anon, authenticated;

-- ============================================================
-- 10. admin_revoke_premium — revoke active premium subscription
-- ============================================================
CREATE OR REPLACE FUNCTION admin_revoke_premium(
  p_password text,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE user_subscriptions
  SET status = 'cancelled', expires_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_revoke_premium(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_revoke_premium(text, uuid) TO anon, authenticated;

-- ============================================================
-- 11. admin_extend_subscription — extend subscription expiry
-- ============================================================
CREATE OR REPLACE FUNCTION admin_extend_subscription(
  p_password text,
  p_sub_id uuid,
  p_extend_days int DEFAULT 365
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE user_subscriptions
  SET expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (p_extend_days || ' days')::interval
  WHERE id = p_sub_id;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_extend_subscription(text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_extend_subscription(text, uuid, int) TO anon, authenticated;

-- ============================================================
-- 12. admin_get_premium_features — return all feature flags
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_premium_features(
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('feature', feature, 'is_premium', is_premium, 'label', label, 'description', description))
    FROM premium_features ORDER BY feature
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_premium_features(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_premium_features(text) TO anon, authenticated;

-- ============================================================
-- 13. admin_update_premium_feature — toggle a feature flag
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_premium_feature(
  p_password text,
  p_feature text,
  p_is_premium boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE premium_features SET is_premium = p_is_premium WHERE feature = p_feature;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean) TO anon, authenticated;

-- ============================================================
-- 14. admin_save_payment_details — create or update payment details
-- ============================================================
CREATE OR REPLACE FUNCTION admin_save_payment_details(
  p_password text,
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_id uuid DEFAULT NULL,
  p_routing_number text DEFAULT '',
  p_instructions text DEFAULT '',
  p_is_active boolean DEFAULT true,
  p_custom_heading text DEFAULT 'Upgrade to Premium',
  p_custom_subtext text DEFAULT 'Subscribe to unlock all premium features',
  p_footer_note text DEFAULT ''
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_exists boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  IF p_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM payment_details WHERE id = p_id) INTO v_exists;
    IF v_exists THEN
      UPDATE payment_details SET
        bank_name = p_bank_name, account_name = p_account_name, account_number = p_account_number,
        routing_number = p_routing_number, instructions = p_instructions, is_active = p_is_active,
        custom_heading = p_custom_heading, custom_subtext = p_custom_subtext, footer_note = p_footer_note
      WHERE id = p_id;
      RETURN true;
    END IF;
  END IF;

  INSERT INTO payment_details (bank_name, account_name, account_number, routing_number, instructions, is_active, custom_heading, custom_subtext, footer_note)
  VALUES (p_bank_name, p_account_name, p_account_number, p_routing_number, p_instructions, p_is_active, p_custom_heading, p_custom_subtext, p_footer_note);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_save_payment_details(text, text, text, text, uuid, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_save_payment_details(text, text, text, text, uuid, text, text, boolean, text, text, text) TO anon, authenticated;

-- ============================================================
-- 15. admin_get_analytics — 30-day time-series data
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_analytics(
  p_password text,
  p_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'users_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(*) AS c
        FROM profiles WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'rooms_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(*) AS c
        FROM rooms WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'tracks_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(*) AS c
        FROM tracks WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'impressions_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', shown_at) AS d, count(*) AS c
        FROM ad_impressions WHERE shown_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'game_plays_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(*) AS c
        FROM game_plays WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'listening_by_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d::date, 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(*) AS c
        FROM listening_events WHERE created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'total_plays', (SELECT count(*) FROM track_plays),
      'total_listening_events', (SELECT count(*) FROM listening_events),
      'total_comments', (SELECT count(*) FROM comments),
      'total_polls', (SELECT count(*) FROM polls),
      'total_game_sessions', (SELECT count(*) FROM game_sessions),
      'total_jam_sessions', (SELECT count(*) FROM jam_sessions),
      'total_ad_impressions', (SELECT count(*) FROM ad_impressions),
      'most_active_room', (SELECT name FROM rooms ORDER BY (SELECT count(*) FROM tracks WHERE room_id = rooms.id) DESC LIMIT 1),
      'most_active_user', (SELECT display_name FROM profiles ORDER BY (SELECT count(*) FROM tracks WHERE uploaded_by = profiles.id) DESC LIMIT 1)
    )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_analytics(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_analytics(text, int) TO anon, authenticated;

-- ============================================================
-- 16. admin_get_activity_logs — paginated, filterable logs
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_activity_logs(
  p_password text,
  p_action_type text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_total int;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  SELECT count(*) INTO v_total FROM activity_logs
  WHERE (p_action_type IS NULL OR action_type = p_action_type)
    AND (p_search IS NULL OR description ILIKE '%' || p_search || '%' OR user_name ILIKE '%' || p_search || '%');

  RETURN jsonb_build_object(
    'total', v_total,
    'logs', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'user_id', user_id, 'user_name', user_name, 'action_type', action_type,
        'description', description, 'entity_type', entity_type, 'entity_id', entity_id,
        'room_id', room_id, 'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM (
        SELECT * FROM activity_logs
        WHERE (p_action_type IS NULL OR action_type = p_action_type)
          AND (p_search IS NULL OR description ILIKE '%' || p_search || '%' OR user_name ILIKE '%' || p_search || '%')
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) t
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_activity_logs(text, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_activity_logs(text, text, text, int, int) TO anon, authenticated;

-- ============================================================
-- 17. admin_export_data — export a table as JSON
-- ============================================================
CREATE OR REPLACE FUNCTION admin_export_data(
  p_password text,
  p_table_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  IF p_table_name = 'users' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, display_name, avatar_url, is_admin, created_at FROM profiles) t), '[]'::jsonb);
  ELSIF p_table_name = 'rooms' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, name, description, owner_id, visibility, join_policy, invite_code, theme_color, created_at FROM rooms) t), '[]'::jsonb);
  ELSIF p_table_name = 'tracks' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, room_id, uploaded_by, title, duration_seconds, created_at FROM tracks) t), '[]'::jsonb);
  ELSIF p_table_name = 'subscriptions' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, user_id, status, payment_ref, payment_amount, receipt_status, granted_at, expires_at, created_at FROM user_subscriptions) t), '[]'::jsonb);
  ELSIF p_table_name = 'ads' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, title, description, video_url, status, trigger_type, impressions, created_at FROM ads) t), '[]'::jsonb);
  ELSIF p_table_name = 'activity_logs' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id, user_name, action_type, description, entity_type, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 500) t), '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object('error', 'unknown_table');
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_export_data(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_export_data(text, text) TO anon, authenticated;

-- ============================================================
-- 18. admin_bug_check — scan for data integrity issues
-- ============================================================
CREATE OR REPLACE FUNCTION admin_bug_check(
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  -- Orphaned tracks (room deleted but track remains)
  IF EXISTS(SELECT 1 FROM tracks t WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = t.room_id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'error', 'title', 'Orphaned Tracks', 'description', 'Tracks referencing non-existent rooms', 'count', (SELECT count(*) FROM tracks t WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = t.room_id)), 'fixable', true);
  END IF;

  -- Orphaned comments (track deleted but comment remains)
  IF EXISTS(SELECT 1 FROM comments c WHERE NOT EXISTS(SELECT 1 FROM tracks t WHERE t.id = c.track_id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'error', 'title', 'Orphaned Comments', 'description', 'Comments referencing non-existent tracks', 'count', (SELECT count(*) FROM comments c WHERE NOT EXISTS(SELECT 1 FROM tracks t WHERE t.id = c.track_id)), 'fixable', true);
  END IF;

  -- Subscriptions without profiles
  IF EXISTS(SELECT 1 FROM user_subscriptions s WHERE NOT EXISTS(SELECT 1 FROM profiles p WHERE p.id = s.user_id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'error', 'title', 'Orphaned Subscriptions', 'description', 'Subscriptions for non-existent users', 'count', (SELECT count(*) FROM user_subscriptions s WHERE NOT EXISTS(SELECT 1 FROM profiles p WHERE p.id = s.user_id)), 'fixable', true);
  END IF;

  -- Rooms with zero members
  IF EXISTS(SELECT 1 FROM rooms r WHERE NOT EXISTS(SELECT 1 FROM room_members rm WHERE rm.room_id = r.id) AND NOT EXISTS(SELECT 1 FROM tracks t WHERE t.room_id = r.id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'warning', 'title', 'Empty Rooms', 'description', 'Rooms with no members and no tracks', 'count', (SELECT count(*) FROM rooms r WHERE NOT EXISTS(SELECT 1 FROM room_members rm WHERE rm.room_id = r.id) AND NOT EXISTS(SELECT 1 FROM tracks t WHERE t.room_id = r.id)), 'fixable', false);
  END IF;

  -- Rooms with no tracks
  IF EXISTS(SELECT 1 FROM rooms r WHERE NOT EXISTS(SELECT 1 FROM tracks t WHERE t.room_id = r.id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'warning', 'title', 'Rooms Without Tracks', 'description', 'Rooms that have no tracks uploaded', 'count', (SELECT count(*) FROM rooms r WHERE NOT EXISTS(SELECT 1 FROM tracks t WHERE t.room_id = r.id)), 'fixable', false);
  END IF;

  -- Duplicate invite codes
  IF EXISTS(SELECT 1 FROM (SELECT invite_code, count(*) as cnt FROM rooms GROUP BY invite_code HAVING count(*) > 1) d) THEN
    v_results := v_results || jsonb_build_object('severity', 'warning', 'title', 'Duplicate Invite Codes', 'description', 'Rooms sharing the same invite code', 'count', (SELECT count(*) FROM (SELECT invite_code FROM rooms GROUP BY invite_code HAVING count(*) > 1) d), 'fixable', false);
  END IF;

  -- Expired ads still marked active
  IF EXISTS(SELECT 1 FROM ads WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < now()) THEN
    v_results := v_results || jsonb_build_object('severity', 'warning', 'title', 'Expired Active Ads', 'description', 'Ads marked active but past their end date', 'count', (SELECT count(*) FROM ads WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < now()), 'fixable', true);
  END IF;

  -- Premium features with empty labels
  IF EXISTS(SELECT 1 FROM premium_features WHERE label IS NULL OR label = '') THEN
    v_results := v_results || jsonb_build_object('severity', 'warning', 'title', 'Premium Features Missing Labels', 'description', 'Premium features with no label text', 'count', (SELECT count(*) FROM premium_features WHERE label IS NULL OR label = ''), 'fixable', false);
  END IF;

  -- Orphaned room members
  IF EXISTS(SELECT 1 FROM room_members rm WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = rm.room_id)) THEN
    v_results := v_results || jsonb_build_object('severity', 'error', 'title', 'Orphaned Room Members', 'description', 'Room members for non-existent rooms', 'count', (SELECT count(*) FROM room_members rm WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = rm.room_id)), 'fixable', true);
  END IF;

  RETURN jsonb_build_object('results', v_results, 'all_clear', (v_results = '[]'::jsonb));
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_bug_check(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_bug_check(text) TO anon, authenticated;

-- ============================================================
-- 19. admin_fix_bug — fix specific data integrity issues
-- ============================================================
CREATE OR REPLACE FUNCTION admin_fix_bug(
  p_password text,
  p_issue text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  IF p_issue = 'Orphaned Tracks' THEN
    DELETE FROM tracks t WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = t.room_id);
  ELSIF p_issue = 'Orphaned Comments' THEN
    DELETE FROM comments c WHERE NOT EXISTS(SELECT 1 FROM tracks t WHERE t.id = c.track_id);
  ELSIF p_issue = 'Orphaned Subscriptions' THEN
    DELETE FROM user_subscriptions s WHERE NOT EXISTS(SELECT 1 FROM profiles p WHERE p.id = s.user_id);
  ELSIF p_issue = 'Expired Active Ads' THEN
    UPDATE ads SET status = 'expired' WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < now();
  ELSIF p_issue = 'Orphaned Room Members' THEN
    DELETE FROM room_members rm WHERE NOT EXISTS(SELECT 1 FROM rooms r WHERE r.id = rm.room_id);
  ELSE
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_fix_bug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_fix_bug(text, text) TO anon, authenticated;

-- ============================================================
-- 20. admin_get_users_enhanced — users with subscription status + room count
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_users_enhanced(
  p_password text,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_total int;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  SELECT count(*) INTO v_total FROM profiles
  WHERE p_search IS NULL OR display_name ILIKE '%' || p_search || '%';

  RETURN jsonb_build_object(
    'total', v_total,
    'users', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
        'is_admin', p.is_admin, 'created_at', p.created_at,
        'is_premium', EXISTS(SELECT 1 FROM user_subscriptions s WHERE s.user_id = p.id AND s.status = 'active'),
        'rooms_owned', (SELECT count(*) FROM rooms WHERE owner_id = p.id),
        'tracks_uploaded', (SELECT count(*) FROM tracks WHERE uploaded_by = p.id),
        'sub_status', (SELECT s.receipt_status FROM user_subscriptions s WHERE s.user_id = p.id ORDER BY s.created_at DESC LIMIT 1)
      ) ORDER BY p.created_at DESC)
      FROM (
        SELECT * FROM profiles
        WHERE p_search IS NULL OR display_name ILIKE '%' || p_search || '%'
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) p
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_users_enhanced(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_users_enhanced(text, text, int, int) TO anon, authenticated;

-- ============================================================
-- 21. admin_get_rooms_enhanced — rooms with member/track counts
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_rooms_enhanced(
  p_password text,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean; v_total int;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  SELECT count(*) INTO v_total FROM rooms
  WHERE p_search IS NULL OR name ILIKE '%' || p_search || '%' OR invite_code ILIKE '%' || p_search || '%';

  RETURN jsonb_build_object(
    'total', v_total,
    'rooms', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'description', r.description, 'owner_id', r.owner_id,
        'cover_url', r.cover_url, 'visibility', r.visibility, 'join_policy', r.join_policy,
        'invite_code', r.invite_code, 'theme_color', r.theme_color,
        'passphrase', r.passphrase, 'created_at', r.created_at,
        'owner_name', p.display_name,
        'member_count', (SELECT count(*) FROM room_members WHERE room_id = r.id),
        'track_count', (SELECT count(*) FROM tracks WHERE room_id = r.id)
      ) ORDER BY r.created_at DESC)
      FROM (
        SELECT * FROM rooms
        WHERE p_search IS NULL OR name ILIKE '%' || p_search || '%' OR invite_code ILIKE '%' || p_search || '%'
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) r
      LEFT JOIN profiles p ON p.id = r.owner_id
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_rooms_enhanced(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_rooms_enhanced(text, text, int, int) TO anon, authenticated;

-- ============================================================
-- 22. admin_get_all_payment_details — all payment configs including inactive
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_all_payment_details(
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'bank_name', bank_name, 'account_name', account_name,
      'account_number', account_number, 'routing_number', routing_number,
      'instructions', instructions, 'is_active', is_active,
      'custom_heading', custom_heading, 'custom_subtext', custom_subtext, 'footer_note', footer_note
    ) ORDER BY is_active DESC)
    FROM payment_details
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_all_payment_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_all_payment_details(text) TO anon, authenticated;

-- ============================================================
-- 23. admin_get_subscriptions_enhanced — all subs with more detail
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_subscriptions_enhanced(
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'pending', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'user_id', s.user_id, 'status', s.status, 'payment_ref', s.payment_ref,
        'payment_amount', s.payment_amount, 'receipt_path', s.receipt_path,
        'receipt_status', s.receipt_status, 'granted_at', s.granted_at,
        'expires_at', s.expires_at, 'created_at', s.created_at,
        'display_name', p.display_name
      ) ORDER BY s.created_at DESC)
      FROM user_subscriptions s
      LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.receipt_status = 'pending'
    ), '[]'::jsonb),
    'active', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'user_id', s.user_id, 'status', s.status, 'payment_ref', s.payment_ref,
        'payment_amount', s.payment_amount, 'receipt_path', s.receipt_path,
        'receipt_status', s.receipt_status, 'granted_at', s.granted_at,
        'expires_at', s.expires_at, 'created_at', s.created_at,
        'display_name', p.display_name
      ) ORDER BY s.expires_at DESC)
      FROM user_subscriptions s
      LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.status = 'active'
    ), '[]'::jsonb),
    'history', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'user_id', s.user_id, 'status', s.status, 'payment_ref', s.payment_ref,
        'payment_amount', s.payment_amount, 'receipt_status', s.receipt_status,
        'expires_at', s.expires_at, 'created_at', s.created_at,
        'display_name', p.display_name
      ) ORDER BY s.created_at DESC)
      FROM user_subscriptions s
      LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.status NOT IN ('active') AND s.receipt_status != 'pending'
      LIMIT 50
    ), '[]'::jsonb),
    'stats', jsonb_build_object(
      'active_count', (SELECT count(*) FROM user_subscriptions WHERE status = 'active'),
      'pending_count', (SELECT count(*) FROM user_subscriptions WHERE receipt_status = 'pending'),
      'total_revenue', (SELECT coalesce(sum(payment_amount), 0) FROM user_subscriptions WHERE receipt_status = 'approved')
    )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_subscriptions_enhanced(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions_enhanced(text) TO anon, authenticated;
