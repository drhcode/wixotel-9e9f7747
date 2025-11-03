-- Add confirmation_number to bookings table
ALTER TABLE bookings ADD COLUMN confirmation_number TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_bookings_confirmation_number ON bookings(confirmation_number);

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.verify_booking_for_review(uuid, text);
DROP FUNCTION IF EXISTS public.create_review_with_validation(uuid, text, text, integer, text, text);

-- Create new verify_booking_for_review with confirmation number
CREATE OR REPLACE FUNCTION public.verify_booking_for_review(p_hotel_id uuid, p_confirmation_number text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT b.id
  FROM public.bookings b
  WHERE b.hotel_id = p_hotel_id
    AND b.confirmation_number = p_confirmation_number
    AND b.status IN ('reserved','checked_in','checked_out')
  LIMIT 1;
$function$;

-- Create new create_review_with_validation with confirmation number
CREATE OR REPLACE FUNCTION public.create_review_with_validation(p_hotel_id uuid, p_confirmation_number text, p_title text, p_rating integer, p_review text, p_photo_url text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_review_id uuid;
  v_guest_email text;
BEGIN
  SELECT public.verify_booking_for_review(p_hotel_id, p_confirmation_number) INTO v_booking_id;
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'no_booking_for_confirmation';
  END IF;

  -- Get guest email from booking
  SELECT guest_email INTO v_guest_email FROM bookings WHERE id = v_booking_id;

  INSERT INTO public.reviews (hotel_id, guest_email, title, rating, review_text, photo_url, booking_id, status)
  VALUES (
    p_hotel_id,
    v_guest_email,
    p_title,
    p_rating,
    p_review,
    NULLIF(p_photo_url, ''),
    v_booking_id,
    'pending'
  ) RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$function$;

-- Add RLS policy for booking lookup by confirmation number
CREATE POLICY "Anyone can view booking by confirmation number"
ON bookings FOR SELECT
USING (confirmation_number IS NOT NULL);