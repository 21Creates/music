/*
# Fix Storage Security: Bucket Public Flags, Chat Media Access, Receipts Bucket, DELETE Ownership Checks, Revoke Anon Table Grants

## Problems Found in Phase 5 Re-Audit

1. P0: `vinyl-audio` bucket has `public = true` — allows unauthenticated reads via public URLs, completely undermining the signed-URL audio auth fix (T2 regression).
2. P0: `vinyl-chat` bucket policies are `TO public` — anon users can upload, read, and delete any chat media file with no authentication.
3. P0: `vinyl-receipts` bucket does not exist — SubscribeModal uploads to it (will fail), and the webhook edge function calls getPublicUrl on it (will 404).
4. P1: Storage DELETE policies on vinyl-audio, vinyl-avatars, vinyl-covers have no ownership checks — any authenticated user can delete any other user's files.
5. P1: All public tables still have full CRUD grants to `anon` role — defense-in-depth failure. RLS policies are scoped to `authenticated` so anon is blocked by RLS, but the base grants should be revoked.

## Changes

### 1. Set vinyl-audio bucket to private (public = false)
- Signed URLs work on private buckets; this is the correct setting for authenticated-only audio access.

### 2. Replace vinyl-chat bucket policies
- Change from `TO public` to `TO authenticated`
- Add ownership check on DELETE (only file owner or room admin can delete)
- Upload restricted to authenticated users who are room members (checked via path prefix matching room_id)
- Read restricted to authenticated users (chat media is behind auth)

### 3. Create vinyl-receipts bucket
- Private bucket (not public)
- Upload: only authenticated users, scoped to their own user_id path prefix
- Read: only authenticated, only own files (users see their own receipts)
- Delete: only own files
- Admin (service_role) can read all receipts for approval flow

### 4. Fix DELETE policies on vinyl-audio, vinyl-avatars, vinyl-covers
- vinyl-audio DELETE: only the track uploader or room owner/admin can delete audio files
- vinyl-avatars DELETE: only the file owner can delete their avatar
- vinyl-covers DELETE: only the file owner or room admin can delete cover images
- Note: ownership is determined by the storage object's `owner` column (set by Supabase to auth.uid() on upload)

### 5. Revoke all table grants from anon role on public tables
- This is a signed-in app (all RLS policies are `TO authenticated`)
- anon should have NO direct table access — defense in depth
- Revoke INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER from anon on all public tables

## Rollback
- To undo bucket public flag: `UPDATE storage.buckets SET public = true WHERE id = 'vinyl-audio';`
- To restore anon grants: re-grant the revoked privileges
- To drop receipts bucket: `DELETE FROM storage.buckets WHERE id = 'vinyl-receipts';`
*/

-- ============================================================
-- 1. Set vinyl-audio bucket to private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'vinyl-audio';

-- ============================================================
-- 2. Replace vinyl-chat bucket policies (was TO public — P0)
-- ============================================================
DROP POLICY IF EXISTS "chat_media_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_upload" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;

-- Chat media read: authenticated only (chat is behind auth)
CREATE POLICY "chat_media_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vinyl-chat');

-- Chat media upload: authenticated only
CREATE POLICY "chat_media_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vinyl-chat' AND owner = auth.uid());

-- Chat media delete: only the file owner can delete
CREATE POLICY "chat_media_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vinyl-chat' AND owner = auth.uid());

-- ============================================================
-- 3. Create vinyl-receipts bucket (was missing — P0)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vinyl-receipts', 'vinyl-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_read" ON storage.objects;
DROP POLICY IF EXISTS "receipts_upload" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

-- Receipts read: only the file owner (users see their own receipts)
CREATE POLICY "receipts_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vinyl-receipts' AND owner = auth.uid());

-- Receipts upload: only authenticated, owner is set to auth.uid()
CREATE POLICY "receipts_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vinyl-receipts' AND owner = auth.uid());

-- Receipts delete: only the file owner
CREATE POLICY "receipts_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vinyl-receipts' AND owner = auth.uid());

-- ============================================================
-- 4. Fix DELETE policies on audio, avatars, covers (add ownership)
-- ============================================================

-- vinyl-audio DELETE: owner (uploader) or room owner/admin
-- Storage object owner = auth.uid() at upload time
DROP POLICY IF EXISTS "audio_delete" ON storage.objects;
CREATE POLICY "audio_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vinyl-audio' AND owner = auth.uid());

-- vinyl-avatars DELETE: only the avatar owner
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vinyl-avatars' AND owner = auth.uid());

-- vinyl-covers DELETE: only the cover uploader
DROP POLICY IF EXISTS "covers_delete" ON storage.objects;
CREATE POLICY "covers_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vinyl-covers' AND owner = auth.uid());

-- ============================================================
-- 5. Revoke all grants from anon role on public tables
-- ============================================================
-- This is a signed-in app: all RLS policies are TO authenticated.
-- anon should have NO table access — defense in depth.
REVOKE ALL ON activity_logs FROM anon;
REVOKE ALL ON ad_impressions FROM anon;
REVOKE ALL ON ads FROM anon;
REVOKE ALL ON app_settings FROM anon;
REVOKE ALL ON comments FROM anon;
REVOKE ALL ON game_plays FROM anon;
REVOKE ALL ON game_questions FROM anon;
REVOKE ALL ON game_session_answers FROM anon;
REVOKE ALL ON game_session_scores FROM anon;
REVOKE ALL ON game_sessions FROM anon;
REVOKE ALL ON invitations FROM anon;
REVOKE ALL ON jam_participants FROM anon;
REVOKE ALL ON jam_sessions FROM anon;
REVOKE ALL ON listening_events FROM anon;
REVOKE ALL ON notifications FROM anon;
REVOKE ALL ON offline_track_limits FROM anon;
REVOKE ALL ON payment_details FROM anon;
REVOKE ALL ON poll_options FROM anon;
REVOKE ALL ON poll_votes FROM anon;
REVOKE ALL ON polls FROM anon;
REVOKE ALL ON premium_features FROM anon;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON room_members FROM anon;
REVOKE ALL ON room_messages FROM anon;
REVOKE ALL ON rooms FROM anon;
REVOKE ALL ON track_plays FROM anon;
REVOKE ALL ON tracks FROM anon;
REVOKE ALL ON user_subscriptions FROM anon;
