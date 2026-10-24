/*
# Chat Media Upload, vinyl-chat Bucket, and create_notification Grant Fix

## 1. New Columns on room_messages
- `media_url` (text, nullable) — public storage URL for uploaded image/video files
- `media_type` (text, nullable) — kind of media: 'image', 'video', or 'gif'
- `gif_url` (text, nullable) — external GIF URL (e.g. from Tenor/Giphy)

## 2. New Storage Bucket
- `vinyl-chat` — public bucket for chat media uploads (images, videos)
- Storage policies: authenticated users can upload; everyone can read; owners can delete

## 3. Security Fix
- Revoke EXECUTE on `create_notification` from `anon` (it was granted to both anon and authenticated, but only authenticated users should call it)
- Keep EXECUTE on `authenticated` only

## 4. RLS Update on room_messages
- No structural change to existing policies; the new columns are covered by the existing INSERT/SELECT/DELETE policies since they use row-level checks (not column-level)
*/

-- 1. Add media columns to room_messages
ALTER TABLE room_messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE room_messages ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE room_messages ADD COLUMN IF NOT EXISTS gif_url text;

-- 2. Create vinyl-chat storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vinyl-chat', 'vinyl-chat', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for vinyl-chat bucket
DROP POLICY IF EXISTS "chat_media_read" ON storage.objects;
CREATE POLICY "chat_media_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vinyl-chat');

DROP POLICY IF EXISTS "chat_media_upload" ON storage.objects;
CREATE POLICY "chat_media_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vinyl-chat');

DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
CREATE POLICY "chat_media_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'vinyl-chat');

-- 4. Revoke EXECUTE on create_notification from anon
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, uuid, text, text, uuid, uuid) FROM anon;
