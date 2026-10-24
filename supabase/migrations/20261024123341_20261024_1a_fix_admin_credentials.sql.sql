/*
# Fix Admin Credential Exposure (P0: X6/A3)

## Problem
The admin password was stored in plaintext in `app_settings.admin_password`.
The `app_settings_select` policy was `USING (true)` for all authenticated users,
so any signed-in user could read the admin password via direct table SELECT.

## Changes
1. Add `admin_password_hash` column (text) to `app_settings`.
2. Migrate existing plaintext password to bcrypt hash using pgcrypto's `crypt()`.
3. Update `verify_admin_password()` to compare against the hash.
4. Revoke column-level access on password columns from anon/authenticated.
5. Drop the old plaintext `admin_password` column.
6. Update `admin_change_password()` and `change_admin_password()` to write hashes.
7. Recreate `admin_get_settings()` and `admin_save_settings()` to exclude hash.

## Rollback
- Re-add `admin_password text DEFAULT 'admin123'` column.
- Revert `verify_admin_password()` to plaintext comparison.
- Revert column grants to full SELECT.
*/

-- 1. Add hash column
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_password_hash text;

-- 2. Migrate existing plaintext to bcrypt hash
UPDATE app_settings
SET admin_password_hash = crypt(admin_password, gen_salt('bf'))
WHERE admin_password_hash IS NULL
  AND admin_password IS NOT NULL
  AND admin_password != '';

INSERT INTO app_settings (id, admin_password_hash)
SELECT 1, crypt('admin123', gen_salt('bf'))
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 1);

UPDATE app_settings
SET admin_password_hash = crypt('admin123', gen_salt('bf'))
WHERE admin_password_hash IS NULL;

-- 3. Replace verify_admin_password function to use hash
CREATE OR REPLACE FUNCTION verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. Revoke column-level SELECT on password columns
REVOKE ALL ON app_settings FROM anon, authenticated;

GRANT SELECT (id, max_rooms_free, max_rooms_premium, premium_popup_copy, premium_price, premium_currency, payment_webhook_url)
ON app_settings TO authenticated;

GRANT UPDATE (id, max_rooms_free, max_rooms_premium, premium_popup_copy, premium_price, premium_currency, payment_webhook_url)
ON app_settings TO authenticated;

GRANT ALL ON app_settings TO service_role;

-- 5. Drop the plaintext column
ALTER TABLE app_settings DROP COLUMN IF EXISTS admin_password;

-- 6. Update password change functions to write hashes
CREATE OR REPLACE FUNCTION admin_change_password(p_password text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION change_admin_password(p_current_password text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 7. Recreate admin_get_settings to not return the hash
DROP FUNCTION IF EXISTS admin_get_settings(text);
CREATE FUNCTION admin_get_settings(p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;
  RETURN (
    SELECT json_build_object(
      'id', id,
      'max_rooms_free', max_rooms_free,
      'max_rooms_premium', max_rooms_premium,
      'premium_popup_copy', premium_popup_copy,
      'premium_price', premium_price,
      'premium_currency', premium_currency,
      'payment_webhook_url', payment_webhook_url
    )
    FROM app_settings WHERE id = 1
  );
END;
$$;

-- 8. Recreate admin_save_settings (drop old version with defaults first)
DROP FUNCTION IF EXISTS admin_save_settings(text, integer, integer, jsonb, numeric, text, text);
CREATE FUNCTION admin_save_settings(
  p_password text,
  p_max_rooms_free integer,
  p_max_rooms_premium integer,
  p_premium_popup_copy jsonb,
  p_premium_price numeric,
  p_premium_currency text,
  p_payment_webhook_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RETURN false;
  END IF;
  UPDATE app_settings
  SET
    max_rooms_free = p_max_rooms_free,
    max_rooms_premium = p_max_rooms_premium,
    premium_popup_copy = p_premium_popup_copy,
    premium_price = p_premium_price,
    premium_currency = p_premium_currency,
    payment_webhook_url = p_payment_webhook_url
  WHERE id = 1;
  RETURN true;
END;
$$;
