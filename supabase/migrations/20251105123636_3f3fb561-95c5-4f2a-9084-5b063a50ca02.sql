-- Drop the old trigger that updates earnings on checkout
DROP TRIGGER IF EXISTS on_booking_checkout_update_earnings ON bookings;

-- Create a function to create earnings only on checkout
CREATE OR REPLACE FUNCTION public.create_earnings_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create earnings when status changes to 'checked_out'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    -- Create earnings record with 8% commission
    INSERT INTO earnings (
      hotel_id,
      booking_id,
      total_amount,
      commission_rate,
      commission_amount,
      status
    ) VALUES (
      NEW.hotel_id,
      NEW.id,
      NEW.total_amount,
      8.0,
      NEW.total_amount * 0.08,
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for earnings on checkout
DROP TRIGGER IF EXISTS on_booking_checkout_create_earnings ON bookings;
CREATE TRIGGER on_booking_checkout_create_earnings
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_earnings_on_checkout();

-- Function to automatically checkout overdue bookings
CREATE OR REPLACE FUNCTION public.auto_checkout_overdue_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update bookings to checked_out if checkout date + 24 hours has passed
  UPDATE bookings
  SET 
    status = 'checked_out',
    updated_at = now()
  WHERE 
    status IN ('reserved', 'checked_in')
    AND check_out < (CURRENT_DATE - INTERVAL '1 day')
    AND check_out IS NOT NULL;
END;
$$;