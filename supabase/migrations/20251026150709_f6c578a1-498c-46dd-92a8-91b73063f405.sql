-- Create storage policies for hotel-assets bucket to allow uploads

-- Allow hotel admins to upload files to their hotel folder
CREATE POLICY "Hotel admins can upload their hotel assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM hotels WHERE owner_id = auth.uid())
);

-- Allow hotel admins to update their hotel assets
CREATE POLICY "Hotel admins can update their hotel assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM hotels WHERE owner_id = auth.uid())
);

-- Allow hotel admins to delete their hotel assets
CREATE POLICY "Hotel admins can delete their hotel assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM hotels WHERE owner_id = auth.uid())
);

-- Allow public read access since bucket is public
CREATE POLICY "Public can view hotel assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hotel-assets');