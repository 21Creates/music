/*
# Phase 2: Room Discovery, Join, Invite, and Approval Queue

## Summary
Server-side join/invite/approve/reject RPCs + discovery_enabled setting.

## New Columns
- app_settings.discovery_enabled (boolean, default true)

## New Functions
- is_room_admin(p_room_id, p_user_id) — checks owner/admin active membership
- join_room(p_room_id, p_passphrase) — enforces join_policy, passphrase, premium tier
- redeem_invite(p_token) — redeems invite token, inserts active member
- approve_join_request(p_member_id) — admin approves pending member
- reject_join_request(p_member_id) — admin rejects (deletes) pending member

## Policy Changes
- invitations: CRUD policies for room owners
- room_members UPDATE: allows room admins + self-update
*/

-- 1. Add discovery_enabled to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS discovery_enabled boolean NOT NULL DEFAULT true;

-- 2. Re-grant SELECT with new column
GRANT SELECT (id, max_rooms_free, max_rooms_premium, premium_popup_copy, premium_price, premium_currency, payment_webhook_url, discovery_enabled) ON app_settings TO authenticated;

-- 3. is_room_admin helper
CREATE OR REPLACE FUNCTION is_room_admin(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = p_room_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_room_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_room_admin(uuid, uuid) TO authenticated;

-- 4. join_room function
CREATE OR REPLACE FUNCTION join_room(p_room_id uuid, p_passphrase text DEFAULT NULL)
RETURNS TABLE(status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_tier text;
  v_existing_status text;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'error'::text, 'Room not found'::text;
    RETURN;
  END IF;

  -- Check if already a member
  SELECT status INTO v_existing_status FROM room_members
    WHERE room_members.room_id = p_room_id AND room_members.user_id = auth.uid();
  IF FOUND THEN
    RETURN QUERY SELECT v_existing_status, 'Already a member with status: ' || v_existing_status;
    RETURN;
  END IF;

  -- Verify passphrase for private rooms
  IF v_room.visibility = 'private' AND v_room.passphrase IS NOT NULL THEN
    IF p_passphrase IS NULL OR p_passphrase != v_room.passphrase THEN
      RETURN QUERY SELECT 'error'::text, 'Invalid passphrase'::text;
      RETURN;
    END IF;
  END IF;

  v_tier := get_entitlements(auth.uid());

  IF v_room.join_policy = 'open' THEN
    IF v_tier = 'premium' THEN
      INSERT INTO room_members (room_id, user_id, role, status)
      VALUES (p_room_id, auth.uid(), 'member', 'active');
      RETURN QUERY SELECT 'active'::text, 'Joined successfully'::text;
    ELSE
      INSERT INTO room_members (room_id, user_id, role, status)
      VALUES (p_room_id, auth.uid(), 'member', 'pending');
      RETURN QUERY SELECT 'pending'::text, 'Join request submitted. Premium members get instant access.'::text;
    END IF;
    RETURN;
  END IF;

  IF v_room.join_policy = 'request' THEN
    INSERT INTO room_members (room_id, user_id, role, status)
    VALUES (p_room_id, auth.uid(), 'member', 'pending');
    RETURN QUERY SELECT 'pending'::text, 'Join request submitted. Waiting for admin approval.'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'error'::text, 'Unknown join policy'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION join_room(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_room(uuid, text) TO authenticated;

-- 5. redeem_invite function (renamed return column to avoid ambiguity)
CREATE OR REPLACE FUNCTION redeem_invite(p_token text)
RETURNS TABLE(success boolean, p_room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv invitations%ROWTYPE;
  v_existing text;
BEGIN
  SELECT * INTO v_inv FROM invitations WHERE token = p_token AND used = false;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  SELECT status INTO v_existing FROM room_members
    WHERE room_members.room_id = v_inv.room_id AND room_members.user_id = auth.uid();
  IF FOUND THEN
    UPDATE invitations SET used = true WHERE id = v_inv.id;
    RETURN QUERY SELECT true, v_inv.room_id;
    RETURN;
  END IF;

  UPDATE invitations SET used = true WHERE id = v_inv.id;
  INSERT INTO room_members (room_id, user_id, role, status)
  VALUES (v_inv.room_id, auth.uid(), 'member', 'active');
  RETURN QUERY SELECT true, v_inv.room_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION redeem_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_invite(text) TO authenticated;

-- 6. approve_join_request
CREATE OR REPLACE FUNCTION approve_join_request(p_member_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member room_members%ROWTYPE;
BEGIN
  SELECT * INTO v_member FROM room_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Member not found'::text;
    RETURN;
  END IF;

  IF NOT is_room_admin(v_member.room_id, auth.uid()) THEN
    RETURN QUERY SELECT false, 'Not authorized'::text;
    RETURN;
  END IF;

  IF v_member.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Member is not pending'::text;
    RETURN;
  END IF;

  UPDATE room_members SET status = 'active' WHERE id = p_member_id;
  RETURN QUERY SELECT true, 'Approved'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_join_request(uuid) TO authenticated;

-- 7. reject_join_request
CREATE OR REPLACE FUNCTION reject_join_request(p_member_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member room_members%ROWTYPE;
BEGIN
  SELECT * INTO v_member FROM room_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Member not found'::text;
    RETURN;
  END IF;

  IF NOT is_room_admin(v_member.room_id, auth.uid()) THEN
    RETURN QUERY SELECT false, 'Not authorized'::text;
    RETURN;
  END IF;

  IF v_member.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Member is not pending'::text;
    RETURN;
  END IF;

  DELETE FROM room_members WHERE id = p_member_id;
  RETURN QUERY SELECT true, 'Rejected'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_join_request(uuid) TO authenticated;

-- 8. Invitation policies for room owners
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert"
ON invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = invitations.room_id AND r.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select"
ON invitations FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = invitations.room_id AND r.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update"
ON invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = invitations.room_id AND r.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM rooms r WHERE r.id = invitations.room_id AND r.owner_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE ON invitations TO authenticated;

-- 9. room_members UPDATE policy — admins can update, users can self-update (leave)
DROP POLICY IF EXISTS "room_members_update" ON room_members;
CREATE POLICY "room_members_update"
ON room_members FOR UPDATE
TO authenticated
USING (
  is_room_admin(room_members.room_id, auth.uid())
  OR room_members.user_id = auth.uid()
)
WITH CHECK (
  is_room_admin(room_members.room_id, auth.uid())
  OR room_members.user_id = auth.uid()
);

-- 10. Allow room owners to update their rooms (for discoverable toggle etc.)
-- Check if rooms UPDATE policy exists and is adequate
DROP POLICY IF EXISTS "rooms_update" ON rooms;
CREATE POLICY "rooms_update"
ON rooms FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
