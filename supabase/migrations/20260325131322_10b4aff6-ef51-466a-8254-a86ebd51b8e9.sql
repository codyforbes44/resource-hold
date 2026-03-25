-- Allow authenticated users to upload to chat_images bucket
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat_images');

-- Allow authenticated users to read their own uploads
CREATE POLICY "Authenticated users can read chat images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat_images');

-- Allow public read access (bucket is already public)
CREATE POLICY "Public read access for chat images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'chat_images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat_images' AND (storage.foldername(name))[1] = auth.uid()::text);