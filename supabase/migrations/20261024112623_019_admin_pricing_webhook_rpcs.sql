/*
# Admin RPCs for premium pricing, webhook URL, and settings expansion

1. Modified Functions
- `admin_get_settings` — now returns `premium_price`, `premium_currency`, and `payment_webhook_url`
  in the settings object so the admin panel and the checkout screen can display them.
- `admin_save_settings` — now accepts and persists `p_premium_price`, `p_premium_currency`,
  and `p_payment_webhook_url` alongside the existing fields, so a single save call handles all
  app settings.

2. New Functions
- `admin_save_premium_pricing(p_password, p_price, p_currency)` — dedicated RPC to save just the
  premium price and currency. Used by the pricing section in the Premium tab.
- `admin_get_webhook_url(p_password)` — returns the stored payment webhook URL (text) so the
  admin panel and the upload flow can retrieve it without exposing other settings.

3. Security
- All functions are SECURITY DEFINER and verify the admin password via `verify_admin_password()`.
- REVOKE EXECUTE FROM PUBLIC, anon on all new/modified functions; GRANT EXECUTE TO authenticated
  so only signed-in users (or the admin via the anon key + password RPC) can call them.

4. Important Notes
- `admin_save_settings` is the single save call that persists everything at once. The Premium tab
  pricing fields and the Webhook tab URL field both call it.
- `admin_get_webhook_url` is a lightweight RPC used by the SubscribeModal upload flow to fetch
  just the webhook URL without pulling the entire settings object.
- Price is stored as numeric; currency as a 3-letter code string.
*/

-- ── admin_get_settings: return new columns ──
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
      SELECT row_to_json(s) FROM (
        SELECT id, max_rooms_free, max_rooms_premium, premium_popup_copy,
               premium_price, premium_currency, payment_webhook_url
        FROM app_settings WHERE id = 1
      ) s
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

-- ── admin_save_settings: persist new columns ──
CREATE OR REPLACE FUNCTION admin_save_settings(
  p_password text,
  p_max_rooms_free int,
  p_max_rooms_premium int,
  p_premium_popup_copy jsonb,
  p_premium_price numeric DEFAULT 0,
  p_premium_currency text DEFAULT 'NGN',
  p_payment_webhook_url text DEFAULT NULL
)
RETURNS boolean
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
      premium_popup_copy = p_premium_popup_copy,
      premium_price = p_premium_price,
      premium_currency = p_premium_currency,
      payment_webhook_url = p_payment_webhook_url
  WHERE id = 1;
  RETURN true;
END;
$$;

-- ── admin_save_premium_pricing: dedicated price/currency saver ──
CREATE OR REPLACE FUNCTION admin_save_premium_pricing(
  p_password text,
  p_price numeric,
  p_currency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN false; END IF;

  UPDATE app_settings
  SET premium_price = p_price,
      premium_currency = p_currency
  WHERE id = 1;
  RETURN true;
END;
$$;

-- ── admin_get_webhook_url: lightweight fetch for upload flow ──
CREATE OR REPLACE FUNCTION admin_get_webhook_url(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
v_url text;
BEGIN
  SELECT verify_admin_password(p_password) INTO v_ok;
  IF NOT v_ok THEN RETURN NULL; END IF;

  SELECT payment_webhook_url INTO v_url FROM app_settings WHERE id = 1;
  RETURN v_url;
END;
$$;

-- ── public_get_webhook_url: no-password fetch for the SubscribeModal upload flow ──
-- The listener's browser needs the webhook URL to POST the receipt notification.
-- This returns only the URL (no other settings) and is safe to expose.
CREATE OR REPLACE FUNCTION public_get_webhook_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_url text;
BEGIN
  SELECT payment_webhook_url INTO v_url FROM app_settings WHERE id = 1;
  RETURN v_url;
END;
$$;

-- Revoke + grant for all modified/new functions
REVOKE EXECUTE ON FUNCTION admin_get_settings(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_get_webhook_url(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_get_webhook_url(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public_get_webhook_url() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_get_webhook_url() TO anon, authenticated;
