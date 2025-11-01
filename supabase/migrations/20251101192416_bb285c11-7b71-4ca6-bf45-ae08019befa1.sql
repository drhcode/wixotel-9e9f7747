-- Create function to notify on check-in/check-out status changes
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create notification if status changed to checked_in or checked_out
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'checked_in' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_in',
        'Guest Checked In',
        'Guest ' || NEW.full_name || ' has checked in',
        false
      );
    ELSIF NEW.status = 'checked_out' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_out',
        'Guest Checked Out',
        'Guest ' || NEW.full_name || ' has checked out',
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on bookings table for status changes
DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();