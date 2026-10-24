/*
# Fix Admin Account Auth Identity
# Adds the missing auth.identities row for the admin user so Supabase Auth
# can validate sign-in attempts.
*/

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'Admin@vinyl.com';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found in auth.users';
  END IF;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = v_user_id
  );

  UPDATE auth.users
  SET last_sign_in_at = now()
  WHERE id = v_user_id AND last_sign_in_at IS NULL;
END $$;
