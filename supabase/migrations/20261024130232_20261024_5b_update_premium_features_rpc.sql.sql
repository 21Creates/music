/*
# Phase 5b: Update admin_get_premium_features to return sort_order

Updates the admin_get_premium_features RPC to include the new sort_order column
in its JSON response and order by it. Also sets sensible initial sort_order values
for existing feature rows based on the FEATURE_CATALOG ordering in the frontend.

## Changes
- admin_get_premium_features: add sort_order to JSON output, ORDER BY sort_order, label
- Set initial sort_order values for known features to match the frontend catalog order
*/

CREATE OR REPLACE FUNCTION public.admin_get_premium_features(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_ok boolean;
BEGIN
SELECT verify_admin_password(p_password) INTO v_ok;
IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

RETURN coalesce((
  SELECT jsonb_agg(jsonb_build_object(
    'feature', feature,
    'is_premium', is_premium,
    'label', label,
    'description', description,
    'sort_order', sort_order
  ))
  FROM premium_features ORDER BY sort_order, label
), '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_premium_features(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_premium_features(text) TO authenticated;

-- Set initial sort_order for known features to match FEATURE_CATALOG order
UPDATE premium_features SET sort_order = 0 WHERE feature = 'mix_mode';
UPDATE premium_features SET sort_order = 1 WHERE feature = 'offline_access';
UPDATE premium_features SET sort_order = 2 WHERE feature = 'game_access';
UPDATE premium_features SET sort_order = 3 WHERE feature = 'chat_attachments';
UPDATE premium_features SET sort_order = 4 WHERE feature = 'ad_free';
UPDATE premium_features SET sort_order = 5 WHERE feature = 'hi_res_audio';
UPDATE premium_features SET sort_order = 6 WHERE feature = 'custom_themes';
UPDATE premium_features SET sort_order = 7 WHERE feature = 'unlimited_rooms';
UPDATE premium_features SET sort_order = 8 WHERE feature = 'lyrics_view';
UPDATE premium_features SET sort_order = 9 WHERE feature = 'equalizer';
UPDATE premium_features SET sort_order = 10 WHERE feature = 'priority_queue';
UPDATE premium_features SET sort_order = 11 WHERE feature = 'custom_room_url';
