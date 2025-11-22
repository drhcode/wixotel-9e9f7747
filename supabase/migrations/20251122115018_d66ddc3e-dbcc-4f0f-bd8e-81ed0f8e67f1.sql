-- Ensure default room status is 'ready'
ALTER TABLE public.rooms 
ALTER COLUMN status SET DEFAULT 'ready';

-- Update any existing rooms with null status to 'ready'
UPDATE public.rooms 
SET status = 'ready' 
WHERE status IS NULL;

-- Create function to automatically update room status based on booking status
CREATE OR REPLACE FUNCTION public.update_room_status_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When booking is checked out, set room to dirty
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE public.rooms
    SET status = 'dirty', updated_at = now()
    WHERE id = NEW.room_id;
  END IF;

  -- When booking is checked in, you could optionally set room to occupied
  -- For now we'll keep the room in its current state during check-in
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic room status updates
DROP TRIGGER IF EXISTS trigger_update_room_status_on_booking ON public.bookings;
CREATE TRIGGER trigger_update_room_status_on_booking
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_status_on_booking_change();

-- Add helpful comment
COMMENT ON FUNCTION public.update_room_status_on_booking_change() IS 'Automatically updates room status to dirty when guest checks out';