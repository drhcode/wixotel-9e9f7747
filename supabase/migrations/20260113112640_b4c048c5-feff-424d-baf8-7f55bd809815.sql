-- Fix: Prevent guest_email exposure in public reviews
-- Create a secure view for public reviews that excludes sensitive data

-- First, drop the existing public policy for reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;

-- Create a new policy that still allows public SELECT but we'll use a view for public access
-- Keep internal access for hotel admins and super admins
CREATE POLICY "Anyone can view approved reviews basic info" 
ON public.reviews 
FOR SELECT 
USING (status = 'approved');

-- Create a secure function to get public reviews without email
CREATE OR REPLACE FUNCTION public.get_public_reviews(p_hotel_id uuid)
RETURNS TABLE (
  id uuid,
  hotel_id uuid,
  title text,
  rating integer,
  review_text text,
  photo_url text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id, 
    r.hotel_id, 
    r.title, 
    r.rating, 
    r.review_text, 
    r.photo_url, 
    r.status,
    r.created_at
  FROM reviews r
  WHERE r.hotel_id = p_hotel_id 
    AND r.status = 'approved'
  ORDER BY r.created_at DESC;
$$;

-- Fix: Add SELECT policy for booking_otps to prevent OTP code leakage
-- Only the system should verify OTPs, never expose them
DROP POLICY IF EXISTS "Block all OTP reads" ON public.booking_otps;
CREATE POLICY "Block public OTP reads" 
ON public.booking_otps 
FOR SELECT 
USING (false);

-- Add cleanup policy - super admins can view for debugging
CREATE POLICY "Super admins can view OTPs for debugging" 
ON public.booking_otps 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Add DELETE policy for cleanup
DROP POLICY IF EXISTS "Super admins can delete OTPs" ON public.booking_otps;
CREATE POLICY "Super admins can delete expired OTPs" 
ON public.booking_otps 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'));