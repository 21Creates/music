/*
# Fix RPC grants for admin (anon role) and drop old admin_save_settings overload

The admin dashboard uses password-based auth with the anon key, so all admin RPCs
must be callable by the anon role. The previous migration only granted the new
7-arg admin_save_settings, admin_get_settings, admin_save_premium_pricing, and
admin_get_webhook_url to authenticated — the admin cannot reach them.

1. Drop the old 4-arg admin_save_settings overload so only the 7-arg version remains.
2. Re-grant all admin-facing functions to anon, authenticated.
*/

DROP FUNCTION IF EXISTS admin_save_settings(text, int, int, jsonb);

REVOKE EXECUTE ON FUNCTION admin_get_settings(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, int, int, jsonb, numeric, text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_get_webhook_url(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_webhook_url(text) TO anon, authenticated;
