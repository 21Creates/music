/*
# Admin Password Gate and Column-Level Security

## Purpose
Adds a password gate to the admin settings save flow. The admin must enter
the correct password before settings are updated. The password is verified
server-side through SECURITY DEFINER functions -- it cannot be bypassed from
the browser. The password column itself is protected by column-level privileges
so it can only be changed through the dedicated function.

## Changes

### 1. New Column
- `app_settings.admin_password` (text, NOT NULL, default 'admin123')
  Stores the admin password used to gate settings saves. The default is a
  placeholder the admin should change immediately via the Change Password UI.

### 2. New Functions (SECURITY DEFINER)
- `save_app_settings(p_password text, p_max_rooms_free int, p_max_rooms_premium int, p_premium_popup_copy jsonb)`
  Returns boolean. Verifies the caller is an admin AND the password matches.
  If both pass, updates the three settings fields and returns true.
  If either fails, returns false with no update performed.
- `change_admin_password(p_current_password text, p_new_password text)`
  Returns boolean. Verifies the caller is an admin AND the current password
  matches. If both pass, updates admin_password and returns true.
  If either fails, returns false with no update performed.

### 3. Security Changes
- Revoke EXECUTE on both new functions from PUBLIC and anon so only
  authenticated users can call them.
- Revoke UPDATE on the `admin_password` column from both `anon` and
  `authenticated` at the column level, so the password cannot be changed via
  a direct table update -- only through the `change_admin_password` function.
- Grant EXECUTE on both functions to `authenticated`.
*/

-- 1. Add admin_password column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'admin_password'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN admin_password text NOT NULL DEFAULT 'admin123';
  END IF;
END $$;

-- 2. Revoke column-level UPDATE on admin_password from anon and authenticated
--    so it can only be changed through the change_admin_password function
REVOKE UPDATE (admin_password) ON app_settings FROM anon;
REVOKE UPDATE (admin_password) ON app_settings FROM authenticated;

-- 3. Create save_app_settings function
CREATE OR REPLACE FUNCTION save_app_settings(
  p_password text,
  p_max_rooms_free int,
  p_max_rooms_premium int,
  p_premium_popup_copy jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_password text;
BEGIN
  -- Verify caller is an admin
  IF NOT is_admin() THEN
    RETURN false;
  END IF;

  -- Fetch the stored password
  SELECT admin_password INTO v_stored_password FROM app_settings WHERE id = 1;

  -- Verify password matches
  IF v_stored_password IS NULL OR v_stored_password <> p_password THEN
    RETURN false;
  END IF;

  -- Password and admin check passed -- update settings
  UPDATE app_settings
  SET
    max_rooms_free = p_max_rooms_free,
    max_rooms_premium = p_max_rooms_premium,
    premium_popup_copy = p_premium_popup_copy
  WHERE id = 1;

  RETURN true;
END;
$$;

-- 4. Create change_admin_password function
CREATE OR REPLACE FUNCTION change_admin_password(
  p_current_password text,
  p_new_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_password text;
BEGIN
  -- Verify caller is an admin
  IF NOT is_admin() THEN
    RETURN false;
  END IF;

  -- Fetch the stored password
  SELECT admin_password INTO v_stored_password FROM app_settings WHERE id = 1;

  -- Verify current password matches
  IF v_stored_password IS NULL OR v_stored_password <> p_current_password THEN
    RETURN false;
  END IF;

  -- Validate new password is not empty
  IF p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN false;
  END IF;

  -- Update the password
  UPDATE app_settings SET admin_password = p_new_password WHERE id = 1;

  RETURN true;
END;
$$;

-- 5. Revoke EXECUTE from PUBLIC and anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION save_app_settings(text, int, int, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION save_app_settings(text, int, int, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION save_app_settings(text, int, int, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION change_admin_password(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION change_admin_password(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION change_admin_password(text, text) TO authenticated;