-- First, clean up any orphaned earnings (where booking was deleted but earnings remain)
UPDATE earnings
SET status = 'cancelled'
WHERE booking_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = earnings.booking_id
  )
  AND status = 'pending';

-- Create a trigger function to update earnings status when booking is deleted
CREATE OR REPLACE FUNCTION public.cancel_earnings_on_booking_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a booking is deleted, set related earnings to 'cancelled'
  UPDATE earnings
  SET status = 'cancelled', updated_at = now()
  WHERE booking_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to automatically cancel earnings when booking is deleted
DROP TRIGGER IF EXISTS on_booking_delete_cancel_earnings ON bookings;
CREATE TRIGGER on_booking_delete_cancel_earnings
  BEFORE DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION cancel_earnings_on_booking_delete();