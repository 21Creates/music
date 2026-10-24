/*
# Fix: Revoke anon EXECUTE from functions recreated in 1a migration

When functions are DROPped and CREATEd (as admin_get_settings and
admin_save_settings were in the 1a migration), Postgres grants EXECUTE
to PUBLIC by default, which includes anon. This migration revokes
anon execute from all functions that still have it.
*/

REVOKE EXECUTE ON FUNCTION mark_notification_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_all_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_settings(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_save_settings(text, integer, integer, jsonb, numeric, text, text) FROM anon;
