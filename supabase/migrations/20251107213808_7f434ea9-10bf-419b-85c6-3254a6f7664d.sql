-- Add lead_id column to bookings table to track which lead the booking originated from
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

-- Update the earnings creation trigger to include lead_id from booking
CREATE OR REPLACE FUNCTION public.create_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create earnings when status changes to 'checked_out'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    -- Create earnings record with 8% commission, including lead_id from booking
    INSERT INTO earnings (
      hotel_id,
      booking_id,
      lead_id,
      total_amount,
      commission_rate,
      commission_amount,
      status
    ) VALUES (
      NEW.hotel_id,
      NEW.id,
      NEW.lead_id,  -- Copy lead_id from booking
      NEW.total_amount,
      8.0,
      NEW.total_amount * 0.08,
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;