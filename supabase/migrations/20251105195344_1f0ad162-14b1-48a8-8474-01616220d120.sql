-- Add SEO fields to hotels table
ALTER TABLE public.hotels
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS seo_description text;

COMMENT ON COLUMN public.hotels.seo_title IS 'SEO-optimized title for public hotel page (recommended 50-60 characters)';
COMMENT ON COLUMN public.hotels.seo_description IS 'SEO-optimized meta description for public hotel page (recommended 150-160 characters)';