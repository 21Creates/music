/*
# Restore anon EXECUTE on admin RPCs

## Problem
The admin dashboard uses a password-only access model (no login required).
Migration 013 granted all admin_* functions to `anon, authenticated`.
Later security migrations revoked anon EXECUTE, breaking the admin page
for unauthenticated users — every RPC returns a permission error, causing
"Unable to reach the server" on the admin login screen and dashboard.

## Fix
Re-grant EXECUTE on all admin_* functions and verify_admin_password to `anon`.

## Security
- Each admin function calls verify_admin_password(p_password) internally
  and returns 'unauthorized'/false if the password is wrong.
- admin_password_hash is not readable by anon or authenticated (column-level revoke).
- No data is exposed without the correct password.
*/

GRANT EXECUTE ON FUNCTION verify_admin_password(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_overview(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_users(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_users_enhanced(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_user_details(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_user(text, uuid, text, boolean, boolean) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_user(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_grant_premium(text, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_revoke_premium(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_rooms(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_rooms_enhanced(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_room_details(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_room(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions_enhanced(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_approve_subscription(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_reject_subscription(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_extend_subscription(text, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_premium_features(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean, text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_add_premium_feature(text, text, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_premium_feature(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_ads(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_toggle_ad(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_ad(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_ad(text, uuid, text, text, text, text, jsonb, jsonb, timestamp with time zone, timestamp with time zone, boolean, text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_create_ad(text, text, text, text, text, jsonb, jsonb, timestamp with time zone, timestamp with time zone, boolean, text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_send_announcement(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_recent_announcements(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, integer, integer, jsonb, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_change_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_analytics(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_activity_logs(text, text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_export_data(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_bug_check(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_fix_bug(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_all_payment_details(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_save_payment_details(text, text, text, text, uuid, text, text, boolean, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_webhook_url(text) TO anon;
