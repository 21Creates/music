/*
# Fix Subscription Self-Approval (P0: P17)

## Problem
The `user_subscriptions` UPDATE policy allowed users to update their own
subscription rows: `USING (user_id = auth.uid() OR is_admin())`. This meant
a user could change their own `status` from `pending` to `active`, granting
themselves premium without admin approval.

## Changes
1. Drop the old `user_subscriptions_update` policy.
2. Create a new UPDATE policy that only allows `is_admin()` — regular users
   cannot update subscription rows at all.
3. Create a new RPC `update_subscription_webhook_status(p_sub_id uuid, p_status text)`
   that allows users to update ONLY the `webhook_status` column on their own
   pending subscriptions. This is needed because the SubscribeModal updates
   `webhook_status` after sending the webhook POST.
4. Tighten INSERT policy: require `status = 'pending'` (users can only create
   pending subscriptions, not active ones).

## Client Change Required
`SubscribeModal.tsx` lines 98 and 100 currently do:
  `supabase.from('user_subscriptions').update({webhook_status: status }).eq('id', subId)`
This will now fail RLS. The client must call the new RPC instead:
  `supabase.rpc('update_subscription_webhook_status', { p_sub_id: subId, p_status: status })`

## Rollback
- Re-create old UPDATE policy: `USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin())`
- Drop the `update_subscription_webhook_status` function.
*/

-- 1. Drop old UPDATE policy
DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;

-- 2. Create new admin-only UPDATE policy
CREATE POLICY "user_subscriptions_update"
ON user_subscriptions FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Tighten INSERT policy: only pending status allowed
DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert"
ON user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- 4. Create RPC for users to update only webhook_status on their own subs
CREATE OR REPLACE FUNCTION update_subscription_webhook_status(p_sub_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the subscription owner can update webhook_status
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE id = p_sub_id AND user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  -- Only allow 'sent' or 'failed' as status values
  IF p_status NOT IN ('sent', 'failed') THEN
    RETURN false;
  END IF;

  UPDATE user_subscriptions
  SET webhook_status = p_status
  WHERE id = p_sub_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

-- Grant execute to authenticated only (not anon, not PUBLIC)
REVOKE EXECUTE ON FUNCTION update_subscription_webhook_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_subscription_webhook_status(uuid, text) TO authenticated;
