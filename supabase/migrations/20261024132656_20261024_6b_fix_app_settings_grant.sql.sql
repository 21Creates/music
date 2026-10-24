/*
# Fix app_settings table-level SELECT grant for authenticated

## Problem
Migration 1a did `REVOKE ALL ON app_settings FROM anon, authenticated`.
Migration 2a only restored column-level grants: `GRANT SELECT (col1, col2, ...) ON app_settings TO authenticated`.
This left no table-level SELECT grant, causing `select('*')` queries from the client to fail
because PostgREST tries to access `admin_password_hash` which is not in the column-level grant.

## Fix
Grant table-level SELECT on app_settings TO authenticated.
The column-level REVOKE on admin_password_hash still protects that column
(column-level revokes override table-level grants in Postgres).

## Rollback
- `REVOKE SELECT ON app_settings FROM authenticated;`
*/

GRANT SELECT ON app_settings TO authenticated;
