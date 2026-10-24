/*
# Password-Only Admin Access
# Replaces the authenticated-session admin model with a password-only gate.
# All admin RPC functions now accept p_admin_password and verify it against
# app_settings.admin_password, callable by the anon role (no login needed).
*/

-- ============================================================
-- 1. verify_admin_password helper (callable by anon)
-- ============================================================
CREATE OR REPLACE FUNCTION verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_settings
    WHERE id = 1 AND admin_password = p_password
  );
$$;
REVOKE EXECUTE ON FUNCTION verify_admin_password(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION verify_admin_password(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(text) TO anon, authenticated;

-- ============================================================
-- 2. admin_get_overview() — returns stats + recent activity
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_overview(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'users', (SELECT count(*) FROM profiles),
      'rooms', (SELECT count(*) FROM rooms),
      'tracks', (SELECT count(*) FROM tracks),
      'premium', (SELECT count(*) FROM user_subscriptions WHERE status = 'active')
    ),
    'activity', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'description', description, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 15) a
    )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_overview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_overview(text) TO anon, authenticated;

-- ============================================================
-- 3. admin_get_users(p_password) — returns all profiles
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_users(p_password text)
RETURNS jsonb
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
      'id', id, 'display_name', display_name, 'avatar_url', avatar_url,
      'is_admin', is_admin, 'created_at', created_at
    ) ORDER BY created_at DESC)
    FROM (SELECT * FROM profiles ORDER BY created_at DESC LIMIT 100) p
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_users(text) TO anon, authenticated;

-- ============================================================
-- 4. admin_get_rooms(p_password) — returns all rooms
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_rooms(p_password text)
RETURNS jsonb
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
      'id', id, 'name', name, 'description', description, 'owner_id', owner_id,
      'cover_url', cover_url, 'visibility', visibility, 'join_policy', join_policy,
      'invite_code', invite_code, 'theme_color', theme_color,
      'passphrase', passphrase, 'created_at', created_at
    ) ORDER BY created_at DESC)
    FROM (SELECT * FROM rooms ORDER BY created_at DESC LIMIT 100) r
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_rooms(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_rooms(text) TO anon, authenticated;

-- ============================================================
-- 5. admin_get_subscriptions(p_password) — returns subscriptions with profile
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_subscriptions(p_password text)
RETURNS jsonb
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
      'id', s.id, 'user_id', s.user_id, 'status', s.status,
      'payment_ref', s.payment_ref, 'payment_amount', s.payment_amount,
      'receipt_path', s.receipt_path, 'receipt_status', s.receipt_status,
      'granted_at', s.granted_at, 'expires_at', s.expires_at, 'created_at', s.created_at,
      'display_name', p.display_name
    ) ORDER BY s.created_at DESC)
    FROM user_subscriptions s
    LEFT JOIN profiles p ON p.id = s.user_id
    LIMIT 50
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_subscriptions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions(text) TO anon, authenticated;

-- ============================================================
-- 6. admin_approve_subscription(p_password, p_sub_id)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_approve_subscription(p_password text, p_sub_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_user_id uuid;
  v_expires timestamptz := now() + interval '1 year';
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE user_subscriptions
  SET receipt_status = 'approved', status = 'active',
      granted_at = now(), expires_at = v_expires
  WHERE id = p_sub_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    PERFORM create_notification(v_user_id, 'premium_approved', null, 'Your premium subscription has been approved!', null, null, null);
  END IF;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_approve_subscription(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_approve_subscription(text, uuid) TO anon, authenticated;

-- ============================================================
-- 7. admin_reject_subscription(p_password, p_sub_id)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_reject_subscription(p_password text, p_sub_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_user_id uuid;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE user_subscriptions
  SET receipt_status = 'rejected', status = 'cancelled'
  WHERE id = p_sub_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    PERFORM create_notification(v_user_id, 'premium_rejected', null, 'Your premium subscription was not approved. Please check your payment details.', null, null, null);
  END IF;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_reject_subscription(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reject_subscription(text, uuid) TO anon, authenticated;

-- ============================================================
-- 8. admin_get_ads(p_password) — returns all ads
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_ads(p_password text)
RETURNS jsonb
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
      'id', id, 'title', title, 'description', description,
      'video_path', video_path, 'video_url', video_url, 'status', status,
      'trigger_type', trigger_type, 'trigger_types', trigger_types,
      'trigger_config', trigger_config, 'starts_at', starts_at, 'ends_at', ends_at,
      'show_to_premium', show_to_premium, 'cta_url', cta_url, 'cta_label', cta_label,
      'close_after_seconds', close_after_seconds, 'skip_duration_seconds', skip_duration_seconds,
      'impressions', impressions, 'created_at', created_at
    ) ORDER BY created_at DESC)
    FROM (SELECT * FROM ads ORDER BY created_at DESC LIMIT 50) a
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_ads(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_ads(text) TO anon, authenticated;

-- ============================================================
-- 9. admin_toggle_ad(p_password, p_ad_id) — toggle active/paused
-- ============================================================
CREATE OR REPLACE FUNCTION admin_toggle_ad(p_password text, p_ad_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_current text;
  v_new text;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN 'unauthorized'; END IF;

  SELECT status INTO v_current FROM ads WHERE id = p_ad_id;
  IF v_current IS NULL THEN RETURN 'not_found'; END IF;

  v_new := CASE WHEN v_current = 'active' THEN 'paused' ELSE 'active' END;
  UPDATE ads SET status = v_new WHERE id = p_ad_id;
  RETURN v_new;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_toggle_ad(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_toggle_ad(text, uuid) TO anon, authenticated;

-- ============================================================
-- 10. admin_send_announcement(p_password, p_message)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_send_announcement(p_password text, p_message text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  r RECORD;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  FOR r IN SELECT id FROM profiles LOOP
    PERFORM create_notification(r.id, 'announcement', null, p_message, null, null, null);
  END LOOP;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_send_announcement(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_send_announcement(text, text) TO anon, authenticated;

-- ============================================================
-- 11. admin_get_recent_announcements(p_password)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_recent_announcements(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('message', message, 'created_at', created_at) ORDER BY created_at DESC)
    FROM (SELECT message, created_at FROM notifications WHERE type = 'announcement' ORDER BY created_at DESC LIMIT 10) n
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_recent_announcements(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_recent_announcements(text) TO anon, authenticated;

-- ============================================================
-- 12. admin_get_settings(p_password) — returns app_settings + payment_details
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_settings(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  RETURN jsonb_build_object(
    'settings', (
      SELECT row_to_json(s) FROM (SELECT id, max_rooms_free, max_rooms_premium, premium_popup_copy FROM app_settings WHERE id = 1) s
    ),
    'payments', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'bank_name', bank_name, 'account_name', account_name,
        'account_number', account_number, 'routing_number', routing_number,
        'instructions', instructions, 'is_active', is_active,
        'custom_heading', custom_heading, 'custom_subtext', custom_subtext, 'footer_note', footer_note
      ) ORDER BY created_at DESC)
      FROM payment_details WHERE is_active = true
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_get_settings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO anon, authenticated;

-- ============================================================
-- 13. admin_save_settings(p_password, p_max_rooms_free, p_max_rooms_premium, p_premium_popup_copy)
-- Replaces the old save_app_settings which required is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION admin_save_settings(
  p_password text,
  p_max_rooms_free int,
  p_max_rooms_premium int,
  p_premium_popup_copy jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE app_settings
  SET max_rooms_free = p_max_rooms_free,
      max_rooms_premium = p_max_rooms_premium,
      premium_popup_copy = p_premium_popup_copy
  WHERE id = 1;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb) TO anon, authenticated;

-- ============================================================
-- 14. admin_change_password(p_password, p_new_password)
-- Replaces the old change_admin_password which required is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION admin_change_password(
  p_password text,
  p_new_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;
  IF p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN RETURN false; END IF;

  UPDATE app_settings SET admin_password = p_new_password WHERE id = 1;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_change_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_change_password(text, text) TO anon, authenticated;
