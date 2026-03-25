-- Drop the overly permissive insert policy and replace with scoped one
DROP POLICY "Authenticated users can upload chat images" ON storage.objects;

CREATE POLICY "Users can upload to own chat_images folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat_images' AND (storage.foldername(name))[1] = auth.uid()::text);