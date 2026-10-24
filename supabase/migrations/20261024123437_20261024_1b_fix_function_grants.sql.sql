/*
# Fix Anonymous-Callable DB Functions (P0: A4, W2)

## Problem
All SECURITY DEFINER functions in the public schema were executable by the
`anon` role. This meant anyone with the anon API key (publicly embedded in the
client) could call admin functions like `admin_grant_premium`,
`admin_delete_user`, etc. The only barrier was the `p_password` parameter,
but the password itself was readable via `app_settings` (fixed in 1a).

## Changes
1. REVOKE EXECUTE on all functions in the public schema from `anon`.
2. GRANT EXECUTE to `authenticated` for functions the signed-in app needs:
   - admin_* functions (password-gated, called from admin panel)
   - verify_admin_password (admin login gate)
   - mark_notification_read, mark_all_notifications_read (user notifications)
   - start_jam, end_jam, heartbeat_jam_participant, update_jam_state (jam sessions)
   - is_admin, is_room_member (helper functions used in policies)
   - create_notification (used by other functions)
   - expire_subscriptions (called from PremiumContext)
   - change_admin_password (admin password change)
   - public_get_webhook_url (called from SubscribeModal — temporary, Phase 3 moves to server)
3. Do NOT grant to `anon` on any function.

## Rationale
- `anon` should never call any function — the app requires sign-in.
- `authenticated` can call admin_* functions because they self-verify via
  `p_password`. The password hash is no longer readable (1a), so brute-forcing
  via the RPC is the only attack vector, which is rate-limited by Supabase.
- `public_get_webhook_url` is temporarily granted to `authenticated` until
  Phase 3 moves the webhook call to a server-side edge function.

## Rollback
- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
*/

-- 1. Nuclear: revoke execute from anon on ALL functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. Grant execute to authenticated for all functions the app needs
-- Admin functions (password-gated, called from AdminPage)
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

-- User-facing functions
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
