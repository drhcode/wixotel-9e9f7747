-- Add storage policies for hotel about us images
CREATE POLICY "Hotel admins can upload about images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = 'hotel-about'
  AND EXISTS (
    SELECT 1 FROM hotels
    WHERE hotels.owner_id = auth.uid()
  )
);

CREATE POLICY "Hotel admins can update their about images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-assets'
  AND (storage.foldername(name))[1] = 'hotel-about'
  AND EXISTS (
    SELECT 1 FROM hotels
    WHERE hotels.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view about images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hotel-assets' AND (storage.foldername(name))[1] = 'hotel-about');