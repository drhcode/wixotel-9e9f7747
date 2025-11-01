
-- Create function to notify when a booking is deleted
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings table
CREATE TRIGGER on_booking_deleted
  AFTER DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_deleted();
