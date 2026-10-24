/*
# Fix SECURITY DEFINER function execute grants

## Overview
The security advisor flagged that all SECURITY DEFINER functions were executable by
the anon role (Postgres grants EXECUTE to PUBLIC by default on new functions).
This migration revokes EXECUTE from anon/PUBLIC on all SECURITY DEFINER functions
and from authenticated on handle_new_user (trigger-only function).

## Changes
1. Revoke EXECUTE from PUBLIC and anon on: is_admin, is_room_member, start_jam,
   end_jam, update_jam_state, heartbeat_jam_participant, expire_subscriptions.
2. Re-grant EXECUTE to authenticated on the functions the app needs to call.
3. Revoke EXECUTE from authenticated on handle_new_user (only the trigger calls it).
*/

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION is_room_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_room_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION start_jam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION start_jam(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION end_jam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION end_jam(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_jam_state(uuid, uuid, numeric, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_jam_state(uuid, uuid, numeric, boolean, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION heartbeat_jam_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION heartbeat_jam_participant(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION expire_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
