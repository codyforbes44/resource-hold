
-- Create public chat_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_images', 'chat_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role (edge functions) to upload
CREATE POLICY "Service role can upload chat images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'chat_images');

-- Allow public read access
CREATE POLICY "Public can read chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat_images');
