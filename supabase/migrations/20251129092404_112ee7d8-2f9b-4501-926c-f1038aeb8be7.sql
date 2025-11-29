-- Add is_verified and is_featured columns to hotels table
ALTER TABLE public.hotels 
ADD COLUMN is_verified boolean NOT NULL DEFAULT false,
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX idx_hotels_is_featured ON public.hotels(is_featured) WHERE is_featured = true;
CREATE INDEX idx_hotels_is_verified ON public.hotels(is_verified) WHERE is_verified = true;