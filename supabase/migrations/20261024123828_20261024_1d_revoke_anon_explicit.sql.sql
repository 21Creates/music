/*
# Fix: Explicitly revoke anon EXECUTE from two remaining functions

The ACL on get_entitlements and update_subscription_webhook_status still
shows anon=X/postgres. REVOKE FROM PUBLIC was not sufficient — need to
explicitly REVOKE FROM anon.
*/

REVOKE EXECUTE ON FUNCTION get_entitlements(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION update_subscription_webhook_status(uuid, text) FROM anon;
