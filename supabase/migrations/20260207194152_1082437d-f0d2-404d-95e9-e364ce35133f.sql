-- Fix: Block direct public access to reviews table to prevent guest_email exposure
-- All public access must go through the secure get_public_reviews() RPC function

-- Drop the current public SELECT policy that exposes all columns including guest_email
DROP POLICY IF EXISTS "Anyone can view approved reviews basic info" ON public.reviews;

-- Create a restrictive policy that blocks all direct anonymous access
-- Authenticated hotel admins can view reviews for their hotel
CREATE POLICY "Hotel admins can view their hotel reviews" 
ON public.reviews 
FOR SELECT 
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- The get_public_reviews() RPC function (SECURITY DEFINER) handles public access
-- It excludes guest_email from the returned data, ensuring PII protection