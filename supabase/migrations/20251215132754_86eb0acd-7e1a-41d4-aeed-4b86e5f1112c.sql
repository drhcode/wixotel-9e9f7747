-- =====================================================
-- SECURITY FIXES FOR ALL ERROR AND WARNING LEVEL ISSUES
-- =====================================================

-- Fix 1: Create security definer function for public hotel access
-- Excludes owner email (sensitive), keeps phone for guest contact
CREATE OR REPLACE FUNCTION public.get_public_hotels()
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
$$;

-- Fix 2: Create security definer function for public hotel by slug
CREATE OR REPLACE FUNCTION public.get_public_hotel_by_slug(p_slug text)
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
  WHERE h.slug = p_slug AND h.status = 'active'
  LIMIT 1
$$;

-- Fix 3: Create security definer function for public room access
-- Excludes ical_token security token
CREATE OR REPLACE FUNCTION public.get_public_rooms(p_hotel_id uuid)
RETURNS TABLE (
  id uuid,
  hotel_id uuid,
  name text,
  description text,
  price numeric,
  capacity integer,
  is_available boolean,
  square_meters numeric,
  amenities text[],
  images text[],
  room_number text,
  status text,
  room_type text,
  main_photo_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id, r.hotel_id, r.name, r.description, r.price,
    r.capacity, r.is_available, r.square_meters, r.amenities,
    r.images, r.room_number, r.status, r.room_type,
    r.main_photo_url, r.created_at, r.updated_at
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id AND r.is_available = true
  ORDER BY r.price ASC
$$;

-- Fix 4: Drop overly permissive public policies from hotels table
DROP POLICY IF EXISTS "Anyone can view active hotels" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can view hotels on landing page" ON public.hotels;

-- Fix 5: Drop overly permissive public policy from rooms table
DROP POLICY IF EXISTS "Anyone can view available rooms" ON public.rooms;

-- Fix 6: Ensure guests table has proper RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Hotel admins can view their guests" ON public.guests;
DROP POLICY IF EXISTS "Hotel admins can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Hotel admins can update their guests" ON public.guests;
DROP POLICY IF EXISTS "Hotel admins can delete their guests" ON public.guests;
DROP POLICY IF EXISTS "Super admins can manage all guests" ON public.guests;

-- Create proper RLS policies for guests table
CREATE POLICY "Hotel admins can view their guests"
ON public.guests FOR SELECT
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert guests"
ON public.guests FOR INSERT
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can update their guests"
ON public.guests FOR UPDATE
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can delete their guests"
ON public.guests FOR DELETE
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can manage all guests"
ON public.guests FOR ALL
USING (has_role(auth.uid(), 'super_admin'));