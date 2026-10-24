/*
# Phase 4: Payment details, notifications, and activity_logs grant cleanup

## Summary
Tightens grants and policies on three tables that had overly permissive access:
- payment_details: restrict SELECT to active records only for non-admins
- notifications: remove unnecessary INSERT/DELETE grants (inserts go via SECURITY DEFINER function)
- activity_logs: remove unnecessary UPDATE/DELETE grants and all anon grants

## Changes

### 1. payment_details (X7 — MEDIUM)
- REPLACE SELECT policy: `USING (true)` → `USING (is_active OR is_admin())`
  so regular users only see active payment methods, not all historical ones.
- REVOKE INSERT, UPDATE, DELETE from authenticated and anon — admin manages
  payment details exclusively through `admin_save_payment_details()` RPC.
- GRANT SELECT to authenticated only (anon removed — no anonymous payment browsing).

### 2. notifications (X10/X11 — MEDIUM)
- REVOKE INSERT, DELETE from authenticated and anon. Inserts are handled by
  the `create_notification()` SECURITY DEFINER function which bypasses RLS.
  No DELETE policy exists (by design — notifications persist). Keeping the
  grants was unnecessary and misleading.
- REVOKE all privileges from anon entirely — notifications are authenticated-only.
- Keep SELECT, UPDATE for authenticated (read + mark-as-read).

### 3. activity_logs (X9 — MEDIUM)
- REVOKE UPDATE, DELETE from authenticated — no UPDATE/DELETE policies exist
  and none are needed (logs are append-only for regular users).
- REVOKE all privileges from anon — activity logs are authenticated-only.
- Keep SELECT, INSERT for authenticated (existing policies cover these).
*/

-- ============================================================
-- 1. payment_details
-- ============================================================
DROP POLICY IF EXISTS "payment_details_select" ON payment_details;
CREATE POLICY "payment_details_select"
ON payment_details FOR SELECT
TO authenticated
USING (is_active OR is_admin());

REVOKE INSERT, UPDATE, DELETE ON payment_details FROM authenticated, anon;
GRANT SELECT ON payment_details TO authenticated;

-- ============================================================
-- 2. notifications
-- ============================================================
REVOKE INSERT, DELETE, UPDATE, SELECT ON notifications FROM anon;
REVOKE INSERT, DELETE ON notifications FROM authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- ============================================================
-- 3. activity_logs
-- ============================================================
REVOKE UPDATE, DELETE, INSERT, SELECT ON activity_logs FROM anon;
REVOKE UPDATE, DELETE ON activity_logs FROM authenticated;
GRANT SELECT, INSERT ON activity_logs TO authenticated;
