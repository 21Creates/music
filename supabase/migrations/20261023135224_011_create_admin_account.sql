/*
# Create Admin Account
# Creates a pre-provisioned admin auth user with a known profile entry.
# Uses a SECURITY DEFINER function to insert into auth.users (which the
# normal authenticated role cannot do), then inserts the profile row with
# is_admin = true.
*/

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'Admin@vinyl.com';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    -- Insert into auth.users with hashed password
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt('noaccess@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Admin"}'
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Upsert the profile row with admin flag
  INSERT INTO profiles (id, display_name, is_admin)
  VALUES (v_user_id, 'Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true, display_name = 'Admin';
END $$;
