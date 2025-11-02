-- Secure booking verification function
CREATE OR REPLACE FUNCTION public.verify_booking_for_review(p_hotel_id uuid, p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
  FROM public.bookings b
  WHERE b.hotel_id = p_hotel_id
    AND lower(trim(b.guest_email)) = lower(trim(p_email))
    AND b.status IN ('reserved','checked_in','checked_out')
  ORDER BY b.check_out DESC
  LIMIT 1;
$$;

-- Secure review creation with server-side validation
CREATE OR REPLACE FUNCTION public.create_review_with_validation(
  p_hotel_id uuid,
  p_email text,
  p_title text,
  p_rating integer,
  p_review text,
  p_photo_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_review_id uuid;
BEGIN
  SELECT public.verify_booking_for_review(p_hotel_id, p_email) INTO v_booking_id;
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'no_booking_for_email';
  END IF;

  INSERT INTO public.reviews (hotel_id, guest_email, title, rating, review_text, photo_url, booking_id, status)
  VALUES (
    p_hotel_id,
    lower(trim(p_email)),
    p_title,
    p_rating,
    p_review,
    NULLIF(p_photo_url, ''),
    v_booking_id,
    'pending'
  ) RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

-- Tighten RLS: prevent direct inserts; only RPC should insert
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;