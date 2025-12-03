-- Drop the previous function and create a more complete one for booking lookup
DROP FUNCTION IF EXISTS public.lookup_booking_by_confirmation(text);

-- Create a comprehensive security definer function for booking lookups
-- Returns full booking details only when exact confirmation number matches
CREATE OR REPLACE FUNCTION public.lookup_booking_by_confirmation(p_confirmation_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', b.id,
    'hotel_id', b.hotel_id,
    'check_in', b.check_in,
    'check_out', b.check_out,
    'status', b.status,
    'payment_status', b.payment_status,
    'total_amount', b.total_amount,
    'guest_count', b.guest_count,
    'full_name', b.full_name,
    'guest_email', b.guest_email,
    'guest_phone', b.guest_phone,
    'notes', b.notes,
    'confirmation_number', b.confirmation_number,
    'rooms', json_build_object(
      'name', r.name,
      'room_number', r.room_number
    ),
    'hotels', json_build_object(
      'name', h.name,
      'email', h.email,
      'phone', h.phone,
      'address', h.address,
      'city', h.city,
      'country', h.country
    )
  ) INTO result
  FROM bookings b
  LEFT JOIN rooms r ON r.id = b.room_id
  LEFT JOIN hotels h ON h.id = b.hotel_id
  WHERE b.confirmation_number = p_confirmation_number
  LIMIT 1;
  
  RETURN result;
END;
$$;