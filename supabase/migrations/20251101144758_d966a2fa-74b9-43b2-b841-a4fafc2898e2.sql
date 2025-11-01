
-- Fix security issue: Set search_path for the notification function
CREATE OR REPLACE FUNCTION notify_booking_deleted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    OLD.hotel_id,
    'booking_deleted',
    'Reservation Deleted',
    'Reservation for ' || OLD.full_name || ' has been deleted',
    false
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
