-- Create trigger function to update earnings status when booking is checked out
CREATE OR REPLACE FUNCTION update_earnings_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking changes to 'checked_out' status, update related earnings to 'completed'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE earnings
    SET status = 'completed', updated_at = now()
    WHERE booking_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_update_earnings_on_checkout ON bookings;
CREATE TRIGGER trigger_update_earnings_on_checkout
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_earnings_on_checkout();