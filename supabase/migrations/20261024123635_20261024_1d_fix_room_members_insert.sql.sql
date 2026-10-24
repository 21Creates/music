/*
# Fix Room Self-Insert + Create getEntitlements (P0: R10/R11, P15)

## Problem
1. `room_members` INSERT policy only checked `user_id = auth.uid()` — any user
   could join any room (including private) with `status: 'active'`. No tier
   check, no approval, no membership verification.
2. No server-side premium enforcement existed. `isPremium` was computed
   entirely client-side from `user_subscriptions` rows the user could modify.

## Changes
1. Add `rooms.discoverable boolean NOT NULL DEFAULT false` column.
2. Create `get_entitlements(p_user_id uuid)` SECURITY DEFINER function that
   returns the user's premium tier ('premium' or 'free') by checking
   `user_subscriptions` for an active, non-expired subscription.
3. Replace `room_members` INSERT policy with one that allows:
   a. Room owner self-insert (creator adding themselves as owner/active)
   b. Room is discoverable=true AND status='pending' (free discovery join)
   c. Room is discoverable=true AND get_entitlements returns 'premium'
      AND status='active' (premium auto-join)
   Direct status='active' on non-discoverable rooms is denied.
   Note: invite-code path requires a `redeem_invite` function which is
   Phase 2 — until then, invite joins via direct insert are blocked.
4. Update the `Room` TypeScript type and `HomePage.tsx` create flow to
   set `discoverable` on room creation (client-side change, done separately).

## Rollback
- ALTER TABLE rooms DROP COLUMN discoverable;
- DROP FUNCTION get_entitlements(uuid);
- Re-create old INSERT policy: WITH CHECK (user_id = auth.uid())
*/

-- 1. Add discoverable column to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT false;

-- 2. Create get_entitlements function
CREATE OR REPLACE FUNCTION get_entitlements(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO has_active;

  IF has_active THEN
    RETURN 'premium';
  END IF;
  RETURN 'free';
END;
$$;

-- Grant execute to authenticated only
REVOKE EXECUTE ON FUNCTION get_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_entitlements(uuid) TO authenticated;

-- 3. Replace room_members INSERT policy
DROP POLICY IF EXISTS "room_members_insert" ON room_members;

CREATE POLICY "room_members_insert"
ON room_members FOR INSERT
TO authenticated
WITH CHECK (
  -- (a) Room owner self-insert (creator adding themselves)
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_members.room_id
        AND r.owner_id = auth.uid()
    )
    AND role = 'owner'
    AND status = 'active'
  )
  OR
  -- (b) Free discovery join: room is discoverable, status must be pending
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_members.room_id
        AND r.discoverable = true
    )
    AND status = 'pending'
    AND role = 'member'
  )
  OR
  -- (c) Premium auto-join: room is discoverable, user is premium, status active
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_members.room_id
        AND r.discoverable = true
    )
    AND get_entitlements(auth.uid()) = 'premium'
    AND status = 'active'
    AND role = 'member'
  )
);
