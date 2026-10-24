/*
# Fix: Revoke PUBLIC execute from recreated functions

Postgres grants EXECUTE to PUBLIC on every new function. Since anon inherits
from PUBLIC, REVOKE FROM anon is insufficient. We must REVOKE FROM PUBLIC,
then GRANT TO authenticated.
*/

REVOKE EXECUTE ON FUNCTION mark_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_get_settings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_save_settings(text, integer, integer, jsonb, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, integer, integer, jsonb, numeric, text, text) TO authenticated;

-- Also revoke PUBLIC from all OTHER functions that were CREATEd with defaults
-- (verify_admin_password, admin_change_password, change_admin_password were CREATE OR REPLACE'd)
REVOKE EXECUTE ON FUNCTION verify_admin_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_admin_password(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_change_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_change_password(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION change_admin_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_admin_password(text, text) TO authenticated;

-- Also check the other functions that existed before — they may have PUBLIC grants too
-- Let's revoke from ALL functions in public schema and re-grant to authenticated
-- This is the nuclear approach for functions we haven't touched yet
DO $$
DECLARE
  fn_rec record;
BEGIN
  FOR fn_rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I(%s) FROM PUBLIC', fn_rec.proname, fn_rec.args);
    EXCEPTION WHEN OTHERS THEN
      -- skip if can't revoke
    END;
  END LOOP;
END;
$$;

-- Now re-grant to authenticated for all user-facing + admin functions
-- (same list as 1b migration)
GRANT EXECUTE ON FUNCTION admin_add_premium_feature(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_subscription(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bug_check(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_ad(text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_ad(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_premium_feature(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_room(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_export_data(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_extend_subscription(text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_fix_bug(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_activity_logs(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_ads(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_payment_details(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_analytics(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_overview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_premium_features(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_recent_announcements(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_room_details(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_rooms(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_rooms_enhanced(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_settings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_subscriptions_enhanced(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_details(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users_enhanced(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_webhook_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_grant_premium(text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_subscription(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_premium(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_payment_details(text, text, text, text, uuid, text, text, boolean, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_premium_pricing(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_settings(text, integer, integer, jsonb, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_send_announcement(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_ad(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_ad(text, uuid, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz, boolean, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_premium_feature(text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user(text, uuid, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION change_admin_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION start_jam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION end_jam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION heartbeat_jam_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_jam_state(uuid, uuid, numeric, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public_get_webhook_url() TO authenticated;
