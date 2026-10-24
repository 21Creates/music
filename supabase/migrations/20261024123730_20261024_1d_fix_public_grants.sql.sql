/*
# Fix: Revoke PUBLIC execute from newly created functions

get_entitlements and update_subscription_webhook_status were created with
CREATE OR REPLACE which grants EXECUTE to PUBLIC. Revoke from PUBLIC and
grant to authenticated only.
*/

REVOKE EXECUTE ON FUNCTION get_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_entitlements(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_subscription_webhook_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_subscription_webhook_status(uuid, text) TO authenticated;
