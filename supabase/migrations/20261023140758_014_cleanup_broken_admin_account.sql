/*
# Clean up broken admin auth user
# Removes the manually created auth user and profile that didn't work
# with Supabase Auth, since we now use password-only admin access.
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'Admin@vinyl.com';
  IF v_user_id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = v_user_id;
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;
