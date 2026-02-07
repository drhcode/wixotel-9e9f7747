-- Fix overly permissive RLS policies by adding proper validation constraints
-- These policies use WITH CHECK (true) which allows unrestricted inserts

-- 1. Fix booking_otps: Add constraints to prevent abuse
-- Only allow insert if email is provided and hotel exists
DROP POLICY IF EXISTS "Anyone can request OTP" ON public.booking_otps;
CREATE POLICY "Anyone can request OTP with valid data"
ON public.booking_otps
FOR INSERT
WITH CHECK (
  -- Email must be provided and valid format (basic check)
  email IS NOT NULL 
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  -- Hotel must exist and be active
  AND EXISTS (
    SELECT 1 FROM public.hotels 
    WHERE hotels.id = hotel_id 
    AND hotels.status = 'active'
  )
);

-- 2. Fix leads: Add validation for required fields and hotel existence
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads with valid data"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Required fields must be present
  full_name IS NOT NULL AND length(full_name) >= 2
  AND email IS NOT NULL AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  AND phone IS NOT NULL AND length(phone) >= 6
  AND check_in IS NOT NULL
  AND check_out IS NOT NULL
  AND check_out > check_in
  -- Hotel must exist and be active
  AND EXISTS (
    SELECT 1 FROM public.hotels 
    WHERE hotels.id = hotel_id 
    AND hotels.status = 'active'
  )
);

-- 3. Fix page_analytics: Validate hotel exists and is active
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.page_analytics;
CREATE POLICY "Anyone can insert analytics for active hotels"
ON public.page_analytics
FOR INSERT
WITH CHECK (
  -- Hotel must exist and be active
  EXISTS (
    SELECT 1 FROM public.hotels 
    WHERE hotels.id = hotel_id 
    AND hotels.status = 'active'
  )
  -- Required tracking fields
  AND page_path IS NOT NULL
  AND session_id IS NOT NULL
  AND visitor_id IS NOT NULL
);

-- 4. Fix referral_applications: Add validation for required fields
DROP POLICY IF EXISTS "Anyone can submit referral applications" ON public.referral_applications;
CREATE POLICY "Anyone can submit valid referral applications"
ON public.referral_applications
FOR INSERT
WITH CHECK (
  -- Required fields with basic validation
  full_name IS NOT NULL AND length(full_name) >= 2
  AND email IS NOT NULL AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  -- Status must be pending for new applications
  AND (status IS NULL OR status = 'pending')
);