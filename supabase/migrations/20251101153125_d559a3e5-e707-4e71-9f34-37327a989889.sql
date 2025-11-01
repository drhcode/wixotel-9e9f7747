-- Add social media fields to hotels table
ALTER TABLE public.hotels
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS google_business_url text;