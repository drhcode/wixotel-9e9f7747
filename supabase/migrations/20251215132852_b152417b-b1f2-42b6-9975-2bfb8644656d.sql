-- Create filtered version of get_public_hotels for landing/listing pages
CREATE OR REPLACE FUNCTION public.get_public_hotels_filtered(
  p_show_on_landing boolean DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_country text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  description text,
  phone text,
  logo_url text,
  images text[],
  amenities text[],
  slug text,
  about_us text,
  about_us_image text,
  google_maps_url text,
  city text,
  country text,
  facebook_url text,
  instagram_url text,
  google_business_url text,
  seo_title text,
  seo_description text,
  latitude numeric,
  longitude numeric,
  is_verified boolean,
  is_featured boolean,
  show_on_landing boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    h.id, h.name, h.address, h.description, h.phone,
    h.logo_url, h.images, h.amenities, h.slug, h.about_us,
    h.about_us_image, h.google_maps_url, h.city, h.country,
    h.facebook_url, h.instagram_url, h.google_business_url,
    h.seo_title, h.seo_description, h.latitude, h.longitude,
    h.is_verified, h.is_featured, h.show_on_landing,
    h.created_at, h.updated_at
  FROM hotels h
  WHERE h.status = 'active'
    AND (p_show_on_landing IS NULL OR h.show_on_landing = p_show_on_landing)
    AND (p_city IS NULL OR h.city = p_city)
    AND (p_country IS NULL OR h.country = p_country)
$$;