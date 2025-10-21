-- Update booking overlap check to treat check-out date as available
-- A room is occupied from check_in (inclusive) to check_out (exclusive)
-- This means if a booking ends on Oct 21, a new booking can start on Oct 21

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
  -- Check if there's any overlapping booking
  -- Overlap occurs when:
  -- 1. New check-in falls within existing booking (check_in < existing check_out AND check_in >= existing check_in)
  -- 2. New check-out falls within existing booking (check_out > existing check_in AND check_out <= existing check_out)
  -- 3. New booking completely encompasses existing booking
  -- Note: check_out date is treated as available (exclusive), so we use < instead of <=
  
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND (
        -- New check-in falls during existing booking
        (p_check_in >= check_in AND p_check_in < check_out)
        -- New check-out falls during existing booking  
        OR (p_check_out > check_in AND p_check_out <= check_out)
        -- New booking completely covers existing booking
        OR (p_check_in <= check_in AND p_check_out >= check_out)
      )
  );
END;
$$;

-- Update available rooms function with same logic
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
        AND (
          -- Check-in falls during existing booking
          (p_check_in >= b.check_in AND p_check_in < b.check_out)
          -- Check-out falls during existing booking
          OR (p_check_out > b.check_in AND p_check_out <= b.check_out)
          -- New booking completely covers existing booking
          OR (p_check_in <= b.check_in AND p_check_out >= b.check_out)
        )
    );
END;
$$;