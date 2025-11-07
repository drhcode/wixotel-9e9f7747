-- Drop old trigger if exists
DROP TRIGGER IF EXISTS create_earnings_on_checkout_trigger ON bookings;
DROP TRIGGER IF EXISTS update_earnings_on_checkout_trigger ON bookings;

-- Create trigger to generate earnings when guest checks in
CREATE TRIGGER create_earnings_on_checkin_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_earnings_on_checkout();

-- Update the function to clearly handle check-in and update status on checkout
CREATE OR REPLACE FUNCTION public.update_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a booking changes to 'checked_out' status, update related earnings to 'completed'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE earnings
    SET status = 'completed', updated_at = now()
    WHERE booking_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to update earnings status when guest checks out
CREATE TRIGGER update_earnings_on_checkout_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_earnings_on_checkout();