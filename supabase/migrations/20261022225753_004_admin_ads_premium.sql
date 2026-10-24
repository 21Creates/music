/*
# Admin, Ads, Premium Subscriptions, Activity Logs, and App Settings

## Overview
This migration adds the administrative and monetization layer: ads system, premium
subscription management (manual payment with receipt upload), app-wide settings,
activity logging, and the subscription expiration mechanism.

## New Tables

### ads
- id, title, description, video_path, video_url, status (draft/active/paused/expired),
  trigger_type, trigger_types (jsonb array), trigger_config (jsonb), starts_at, ends_at,
  show_to_premium, cta_url, cta_label, close_after_seconds, skip_duration_seconds,
  impressions (integer counter), created_at

### ad_impressions
- id, ad_id (FK cascade), user_id (default auth.uid()), room_id, shown_at

### premium_features
- feature (text PK), is_premium (boolean), label, description

### user_subscriptions
- id, user_id (default auth.uid()), status (active/expired/cancelled/pending),
  payment_ref, payment_amount, receipt_path, receipt_status (pending/approved/rejected),
  granted_at, expires_at, created_at

### payment_details
- id, bank_name, account_name, account_number, routing_number, instructions,
  is_active, custom_heading, custom_subtext, footer_note

### app_settings
- id (singleton PK = 1), max_rooms_free, max_rooms_premium, premium_popup_copy (jsonb)

### activity_logs
- id, user_id, user_name, action_type, description, entity_type, entity_id, room_id,
  metadata (jsonb), created_at

## New Functions
- expire_subscriptions(): marks subscriptions past their expiry as expired. Called
  on each premium check. SECURITY DEFINER, granted to authenticated.
- log_activity(): trigger function for automatic activity logging on key actions.

## Security
- ads: all authenticated can SELECT (to display ads); only admins can INSERT/UPDATE/DELETE.
- ad_impressions: self INSERT/SELECT; admins can SELECT all.
- premium_features: all authenticated SELECT; admin INSERT/UPDATE/DELETE.
- user_subscriptions: self SELECT/INSERT/UPDATE; admins can SELECT/UPDATE all (for approval).
- payment_details: all authenticated SELECT (to show payment info); admin INSERT/UPDATE/DELETE.
- app_settings: all authenticated SELECT; admin UPDATE.
- activity_logs: self SELECT; admin SELECT all.
- Admin checks use the is_admin() function defined in migration 001.
*/

-- ============================================================
-- ads table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  video_path text,
  video_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired')),
  trigger_type text DEFAULT 'on_any_page',
  trigger_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  show_to_premium boolean NOT NULL DEFAULT false,
  cta_url text,
  cta_label text DEFAULT 'Learn More',
  close_after_seconds integer DEFAULT 5,
  skip_duration_seconds integer DEFAULT 5,
  impressions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON ads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ads TO authenticated;

DROP POLICY IF EXISTS "ads_select" ON ads;
CREATE POLICY "ads_select" ON ads FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ads_insert" ON ads;
CREATE POLICY "ads_insert" ON ads FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "ads_update" ON ads;
CREATE POLICY "ads_update" ON ads FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "ads_delete" ON ads;
CREATE POLICY "ads_delete" ON ads FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- ad_impressions table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid,
  shown_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON ad_impressions TO authenticated;

DROP POLICY IF EXISTS "ad_impressions_select" ON ad_impressions;
CREATE POLICY "ad_impressions_select" ON ad_impressions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "ad_impressions_insert" ON ad_impressions;
CREATE POLICY "ad_impressions_insert" ON ad_impressions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- premium_features table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS premium_features (
  feature text PRIMARY KEY,
  is_premium boolean NOT NULL DEFAULT true,
  label text NOT NULL DEFAULT '',
  description text DEFAULT ''
);
ALTER TABLE premium_features ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON premium_features TO authenticated;
GRANT INSERT, UPDATE, DELETE ON premium_features TO authenticated;

DROP POLICY IF EXISTS "premium_features_select" ON premium_features;
CREATE POLICY "premium_features_select" ON premium_features FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "premium_features_insert" ON premium_features;
CREATE POLICY "premium_features_insert" ON premium_features FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "premium_features_update" ON premium_features;
CREATE POLICY "premium_features_update" ON premium_features FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "premium_features_delete" ON premium_features;
CREATE POLICY "premium_features_delete" ON premium_features FOR DELETE TO authenticated
  USING (is_admin());

-- Seed default premium features
INSERT INTO premium_features (feature, is_premium, label, description) VALUES
  ('mix_mode', true, 'Mix Mode', 'Crossfade between tracks with Web Audio API'),
  ('offline_access', true, 'Offline Access', 'Download tracks for offline listening'),
  ('game_access', true, 'Game Access', 'Play games in rooms'),
  ('chat_attachments', true, 'Chat Attachments', 'Send media attachments in comments')
ON CONFLICT (feature) DO NOTHING;

-- ============================================================
-- user_subscriptions table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  payment_ref text DEFAULT '',
  payment_amount numeric DEFAULT 0,
  receipt_path text,
  receipt_status text NOT NULL DEFAULT 'pending' CHECK (receipt_status IN ('pending', 'approved', 'rejected')),
  granted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;

DROP POLICY IF EXISTS "user_subscriptions_select" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select" ON user_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert" ON user_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update" ON user_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- ============================================================
-- payment_details table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  routing_number text DEFAULT '',
  instructions text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  custom_heading text DEFAULT 'Upgrade to Premium',
  custom_subtext text DEFAULT 'Subscribe to unlock all premium features',
  footer_note text DEFAULT ''
);
ALTER TABLE payment_details ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON payment_details TO authenticated;
GRANT INSERT, UPDATE, DELETE ON payment_details TO authenticated;

DROP POLICY IF EXISTS "payment_details_select" ON payment_details;
CREATE POLICY "payment_details_select" ON payment_details FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "payment_details_insert" ON payment_details;
CREATE POLICY "payment_details_insert" ON payment_details FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payment_details_update" ON payment_details;
CREATE POLICY "payment_details_update" ON payment_details FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payment_details_delete" ON payment_details;
CREATE POLICY "payment_details_delete" ON payment_details FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- app_settings table + policies (singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_rooms_free integer NOT NULL DEFAULT 3,
  max_rooms_premium integer NOT NULL DEFAULT 20,
  premium_popup_copy jsonb NOT NULL DEFAULT '{"title":"Upgrade to Premium","body":"Unlock mix mode, offline listening, games, and more!","cta_label":"Subscribe Now"}'::jsonb
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON app_settings TO authenticated;
GRANT UPDATE ON app_settings TO authenticated;

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "app_settings_update" ON app_settings;
CREATE POLICY "app_settings_update" ON app_settings FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed default settings row
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- activity_logs table + policies
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text DEFAULT '',
  action_type text NOT NULL DEFAULT '',
  description text DEFAULT '',
  entity_type text DEFAULT '',
  entity_id uuid,
  room_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON activity_logs TO authenticated;

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- ============================================================
-- expire_subscriptions() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < now();
END;
$$;
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_room ON activity_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
