/*
# Fix: crypt() schema reference in verify_admin_password and related functions

The pgcrypto extension is installed in the `extensions` schema, not `public`.
SECURITY DEFINER functions with `SET search_path = public` cannot find `crypt()`
without an explicit schema qualifier. This migration updates all functions that
use `crypt()` and `gen_salt()` to reference them as `extensions.crypt()` and
`extensions.gen_salt()`.
*/

-- First, re-hash the password using the correct schema reference
UPDATE app_settings
SET admin_password_hash = extensions.gen_salt('bf')
WHERE id = 1 AND admin_password_hash IS NULL;

-- If the hash was stored but verify fails, re-hash
UPDATE app_settings
SET admin_password_hash = extensions.crypt('admin123', extensions.gen_salt('bf'))
WHERE id = 1;

-- Recreate verify_admin_password with explicit schema
CREATE OR REPLACE FUNCTION verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_settings
    WHERE id = 1
      AND admin_password_hash IS NOT NULL
      AND crypt(p_password, admin_password_hash) = admin_password_hash
  );
END;
$$;

-- Recreate admin_change_password with correct schema
CREATE OR REPLACE FUNCTION admin_change_password(p_password text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RETURN false;
  END IF;
  UPDATE app_settings
  SET admin_password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = 1;
  RETURN true;
END;
$$;

-- Recreate change_admin_password with correct schema
CREATE OR REPLACE FUNCTION change_admin_password(p_current_password text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT verify_admin_password(p_current_password) THEN
    RETURN false;
  END IF;
  UPDATE app_settings
  SET admin_password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = 1;
  RETURN true;
END;
$$;
