-- Add fields for landing page visibility and geolocation
ALTER TABLE public.hotels
ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text;

-- Create index for faster queries on landing page
CREATE INDEX IF NOT EXISTS idx_hotels_show_on_landing ON public.hotels(show_on_landing) WHERE show_on_landing = true;

-- Update RLS policy to allow anyone to view hotels that are active and shown on landing
CREATE POLICY "Anyone can view hotels on landing page"
ON public.hotels
FOR SELECT
USING (status = 'active'::hotel_status AND show_on_landing = true);