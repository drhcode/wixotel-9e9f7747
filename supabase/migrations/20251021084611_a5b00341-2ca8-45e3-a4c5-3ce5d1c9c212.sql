-- Fix booking overlap logic to properly treat check-out as exclusive
-- Two date ranges [a,b) and [c,d) overlap if and only if: a < d AND c < b
-- This ensures a room that checks out on Oct 22 is available for check-in on Oct 22

CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_room_id uuid, 
  p_check_in date, 
  p_check_out date, 
  p_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if there's any overlapping booking using interval overlap logic
  -- Overlap occurs when: new_start < existing_end AND existing_start < new_end
  -- This treats check-out date as exclusive (available for next booking)
  
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND p_check_in < check_out
      AND check_in < p_check_out
  );
END;
$$;

-- Update available rooms function with same simplified logic
CREATE OR REPLACE FUNCTION public.get_available_rooms(
  p_hotel_id uuid, 
  p_check_in date, 
  p_check_out date
)
RETURNS TABLE(
  id uuid, 
  name text, 
  room_number text, 
  room_type text, 
  price numeric, 
  capacity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        AND p_check_in < b.check_out
        AND b.check_in < p_check_out
    );
END;
$$;