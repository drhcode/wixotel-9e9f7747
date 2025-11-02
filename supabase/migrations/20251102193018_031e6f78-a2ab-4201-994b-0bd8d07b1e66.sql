-- Fix typo in notification function
CREATE OR REPLACE FUNCTION public.create_notification_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    NEW.hotel_id,
    'new_booking',
    'New Reservation',
    'New reservation for ' || NEW.full_name || ' from ' || NEW.check_in || ' to ' || NEW.check_out,
    false
  );
  RETURN NEW;
END;
$$;