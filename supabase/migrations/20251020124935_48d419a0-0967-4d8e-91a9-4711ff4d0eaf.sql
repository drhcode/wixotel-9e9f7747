-- Create storage bucket for hotel assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-assets',
  'hotel-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for hotel assets
CREATE POLICY "Hotel admins can upload their assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hotel-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hotel admins can update their assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hotel admins can delete their assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hotel-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hotel assets are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hotel-assets');