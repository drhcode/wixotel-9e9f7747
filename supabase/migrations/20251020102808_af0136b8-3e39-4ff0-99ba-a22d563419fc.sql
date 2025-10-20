-- Add room number and status fields
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_number TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'cleanup', 'dirty', 'occupied'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_dates ON bookings(hotel_id, check_in, check_out);

-- Update room type to be more specific
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'standard';

-- Function to check for overlapping bookings
CREATE OR REPLACE FUNCTION check_booking_overlap(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND (
        (check_in <= p_check_in AND check_out > p_check_in)
        OR (check_in < p_check_out AND check_out >= p_check_out)
        OR (check_in >= p_check_in AND check_out <= p_check_out)
      )
  );
END;
$$;

-- Function to get available rooms for date range
CREATE OR REPLACE FUNCTION get_available_rooms(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  room_number TEXT,
  room_type TEXT,
  price NUMERIC,
  capacity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
          (b.check_in <= p_check_in AND b.check_out > p_check_in)
          OR (b.check_in < p_check_out AND b.check_out >= p_check_out)
          OR (b.check_in >= p_check_in AND b.check_out <= p_check_out)
        )
    );
END;
$$;