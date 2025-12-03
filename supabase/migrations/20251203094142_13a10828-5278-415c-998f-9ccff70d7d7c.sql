-- Remove the overly permissive booking policy that exposes all PII
DROP POLICY IF EXISTS "Anyone can view booking by confirmation number" ON public.bookings;

-- Create a security definer function for safe booking lookups
-- This only returns a single booking when the exact confirmation number is provided
CREATE OR REPLACE FUNCTION public.lookup_booking_by_confirmation(p_confirmation_number text)
RETURNS TABLE (
  id uuid,
  hotel_id uuid,
  check_in date,
  check_out date,
  status booking_status,
  total_amount numeric,
  guest_count integer,
  full_name text,
  confirmation_number text,
  room_name text,
  hotel_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.hotel_id,
    b.check_in,
    b.check_out,
    b.status,
    b.total_amount,
    b.guest_count,
    b.full_name,
    b.confirmation_number,
    r.name as room_name,
    h.name as hotel_name
  FROM bookings b
  LEFT JOIN rooms r ON r.id = b.room_id
  LEFT JOIN hotels h ON h.id = b.hotel_id
  WHERE b.confirmation_number = p_confirmation_number
  LIMIT 1;
END;
$$;