-- Add slug field to hotels table for URL-friendly hotel names
ALTER TABLE public.hotels
ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_hotels_slug ON public.hotels(slug);

-- Add policy to allow anyone to view active/approved hotels
CREATE POLICY "Anyone can view active hotels"
ON public.hotels
FOR SELECT
USING (status = 'active');

-- Update the rooms policy name for clarity (it already allows public viewing of available rooms)