-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_available_rooms(uuid, date, date);

-- Recreate with optional booking_id parameter
CREATE OR REPLACE FUNCTION public.get_available_rooms(
  p_hotel_id uuid, 
  p_check_in date, 
  p_check_out date,
  p_booking_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, room_number text, room_type text, price numeric, capacity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.room_number,
    r.room_type,
    r.price,
    r.capacity
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_available = true
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.room_id = r.id
        AND b.status NOT IN ('cancelled', 'checked_out')
        -- Exclude current booking if provided (for editing)
        AND (p_booking_id IS NULL OR b.id != p_booking_id)
        -- Check for date overlap: new_start < existing_end AND existing_start < new_end
        AND p_check_in < b.check_out
        AND b.check_in < p_check_out
    );
END;
$function$;