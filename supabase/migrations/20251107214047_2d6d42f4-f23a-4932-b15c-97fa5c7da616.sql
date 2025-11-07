-- Update earnings creation to happen on check-in instead of check-out
CREATE OR REPLACE FUNCTION public.create_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create earnings when status changes to 'checked_in' (commission valid upon check-in)
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
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