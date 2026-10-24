/*
# Profiles & Auth Foundation

## Overview
This migration establishes the user profile system that extends Supabase's built-in auth.users table.
It creates a profiles table that is automatically populated when a user signs up, along with
an admin-checking helper function.

## New Tables

### profiles
- `id` (uuid, primary key) — references auth.users(id), cascading on delete. One profile per auth user.
- `display_name` (text) — the user's chosen display name shown across the app.
- `avatar_url` (text) — URL to the user's avatar image in storage.
- `is_admin` (boolean, default false) — flag indicating admin privileges. First registered user gets admin automatically via trigger.
- `created_at` (timestamptz, default now()) — when the profile was created.

## New Functions

### handle_new_user()
- Trigger function that fires after a new row is inserted into auth.users.
- Creates a corresponding profile row with the user's id and display_name derived from email.
- If this is the first user ever to register (no existing profiles), sets is_admin = true.

### is_admin()
- Returns boolean indicating whether the calling user (auth.uid()) has is_admin = true in profiles.
- Used by RLS policies and application code to gate admin-only operations.

## Security
- RLS enabled on profiles.
- Grant SELECT, UPDATE to authenticated (users can view all profiles but only update their own).
- SELECT policy: any authenticated user can view any profile (needed for member lists, comment authors, etc.)
- UPDATE policy: users can only update their own profile.
- No INSERT policy needed — profiles are created by the trigger function (which runs as the postgres/definer role).
- No DELETE — profiles cascade-delete with auth.users.
- The trigger function is SECURITY DEFINER so it can insert into profiles regardless of RLS.
- REVOKE EXECUTE on handle_new_user from PUBLIC/anon so it can only be called by the trigger.
- is_admin() is executable by authenticated users.
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

-- SELECT: any authenticated user can view any profile
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    (SELECT COUNT(*) = 0 FROM profiles)
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Revoke execute from PUBLIC so only the trigger can call it
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon;

-- is_admin() helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
