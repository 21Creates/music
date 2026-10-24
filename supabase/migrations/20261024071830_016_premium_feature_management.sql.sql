/*
# Premium Feature Management — Full CRUD for Feature Flags

## Summary
Extends the admin premium feature system to support full CRUD operations:
- Update label and description (not just the is_premium toggle)
- Add new feature flags
- Delete feature flags

## Changes
1. Replaces `admin_update_premium_feature` to accept optional label and description params
2. Adds `admin_add_premium_feature` for creating new feature flags
3. Adds `admin_delete_premium_feature` for removing feature flags

## Security
- All functions are SECURITY DEFINER with `search_path = public`
- All require admin password verification via `verify_admin_password()`
- EXECUTE granted to `anon, authenticated` (password-gated)
*/

-- ============================================================
-- 1. Replace admin_update_premium_feature to support label/description updates
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_premium_feature(
  p_password text,
  p_feature text,
  p_is_premium boolean,
  p_label text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE premium_features
  SET is_premium = p_is_premium,
      label = COALESCE(p_label, label),
      description = COALESCE(p_description, description)
  WHERE feature = p_feature;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean, text, text) TO anon, authenticated;

-- ============================================================
-- 2. admin_add_premium_feature — create a new feature flag
-- ============================================================
CREATE OR REPLACE FUNCTION admin_add_premium_feature(
  p_password text,
  p_feature text,
  p_label text,
  p_description text DEFAULT '',
  p_is_premium boolean DEFAULT true
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  INSERT INTO premium_features (feature, is_premium, label, description)
  VALUES (p_feature, p_is_premium, p_label, p_description)
  ON CONFLICT (feature) DO NOTHING;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_add_premium_feature(text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_premium_feature(text, text, text, text, boolean) TO anon, authenticated;

-- ============================================================
-- 3. admin_delete_premium_feature — remove a feature flag
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_premium_feature(
  p_password text,
  p_feature text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  DELETE FROM premium_features WHERE feature = p_feature;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_delete_premium_feature(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_premium_feature(text, text) TO anon, authenticated;
