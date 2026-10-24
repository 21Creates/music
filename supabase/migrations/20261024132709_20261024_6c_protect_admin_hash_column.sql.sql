/*
# Re-grant column-level protection on admin_password_hash

## Problem
The previous migration (6b) granted table-level SELECT on app_settings to authenticated.
In Postgres, a table-level grant overrides column-level restrictions — admin_password_hash
became readable again. This re-applies the column-level REVOKE to protect the hash.

## Fix
REVOKE SELECT (admin_password_hash) ON app_settings FROM authenticated.
This ensures the admin password hash is not readable by authenticated users,
while all other columns remain accessible via the table-level grant.

## Rollback
- `GRANT SELECT (admin_password_hash) ON app_settings TO authenticated;`
*/

REVOKE SELECT (admin_password_hash) ON app_settings FROM authenticated;
