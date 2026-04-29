-- Create storage bucket for provider images
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-images', 'provider-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for provider-images bucket
CREATE POLICY "Anyone can view provider images"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-images');

CREATE POLICY "Authenticated users can upload provider images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own provider images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'provider-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own provider images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'provider-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

