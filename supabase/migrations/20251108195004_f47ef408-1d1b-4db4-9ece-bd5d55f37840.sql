-- Fix earnings creation to only apply to bookings from leads
CREATE OR REPLACE FUNCTION public.create_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create earnings ONLY when status changes to 'checked_in' AND the booking came from a lead
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' AND NEW.lead_id IS NOT NULL THEN
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
      NEW.lead_id,
      NEW.total_amount,
      8.0,
      NEW.total_amount * 0.08,
      'pending'  -- Set to pending on check-in
    );
  END IF;
  
  RETURN NEW;
END;
$function$;