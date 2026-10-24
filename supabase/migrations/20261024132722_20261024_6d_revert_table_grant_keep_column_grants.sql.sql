/*
# Revert table-level grant, keep column-level grants only

## Problem
Table-level SELECT on app_settings makes admin_password_hash readable.
Column-level REVOKE cannot override a table-level GRANT in Postgres.
The client's select('*') fails without a table-level grant because it hits admin_password_hash.

## Fix
1. REVOKE table-level SELECT from authenticated (undo 6b)
2. Re-apply column-level SELECT grant for all safe columns (ensures they're granted)
3. The client code should select specific columns, not '*'

## Rollback
- `GRANT SELECT ON app_settings TO authenticated;`
*/

REVOKE SELECT ON app_settings FROM authenticated;

GRANT SELECT (id, max_rooms_free, max_rooms_premium, premium_popup_copy, premium_price, premium_currency, payment_webhook_url, discovery_enabled) ON app_settings TO authenticated;
